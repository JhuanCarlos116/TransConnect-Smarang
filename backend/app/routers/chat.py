"""Natural-language layer on top of the Location Allocation Model.

Per the PRD's "AI recommendation" feature: a user types a plain-language
question ("tolong rekomendasikan saya titik halte bus yang baru") and gets an
explained answer. The split that matters here -- and the reason this file is
small -- is that Gemini never picks a location. The actual recommendations
come straight from the greedy Maximal Covering Location Problem solver in
build_location_allocation.py; Gemini's only job is turning that already-computed,
already-verified JSON into a natural-language answer, grounded strictly in the
numbers it's handed. Letting an LLM freehand geographic coordinates for a
district it has no real knowledge of would risk confidently hallucinated
locations -- exactly the kind of fabricated-AI-output this project has
avoided everywhere else.
"""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.schemas.chat import ChatRequest, ChatResponse, RecommendationSummary
from app.services.gemini_client import GeminiError, generate_reply

router = APIRouter()

RECOMMENDATIONS_PATH = (
    Path(__file__).resolve().parent.parent.parent / "data" / "processed" / "halte_recommendations.geojson"
)

SYSTEM_INSTRUCTION_TEMPLATE = """Kamu adalah asisten DISHUB Kota Semarang di dashboard TransConnect Semarang.
Tugasmu HANYA menjelaskan hasil Location Allocation Model (algoritma Maximal Covering
Location Problem) yang merekomendasikan lokasi halte BRT baru di Kecamatan Tembalang.

ATURAN KETAT:
- Jawab HANYA berdasarkan data JSON di bawah ini. JANGAN PERNAH mengarang angka,
  koordinat, nama kelurahan, atau lokasi yang tidak ada di data ini.
- Data ini dihasilkan dari algoritma optimasi klasik (greedy Maximal Coverage),
  BUKAN machine learning/AI generatif -- kamu hanya menerjemahkan hasilnya ke
  bahasa natural, bukan yang menentukan lokasinya. Jujur soal ini kalau ditanya.
- Kalau user bertanya sesuatu yang tidak bisa dijawab dari data ini (misalnya
  soal kondisi fisik halte existing, rute bus, jadwal, dsb.), katakan dengan
  jujur bahwa itu di luar cakupan data yang kamu punya -- jangan menebak.
- Bahasa Indonesia, ramah tapi profesional, ringkas (maksimal 4-5 kalimat),
  sebutkan angka konkret dari data saat relevan.

DATA (metode: {method}, ambang batas "terlayani": {threshold} menit jalan kaki,
total populasi Tembalang (estimasi grid): {total_population} jiwa, sudah
terlayani halte existing: {already_served} jiwa):

{recommendations_json}
"""


def _load_recommendations() -> dict:
    if not RECOMMENDATIONS_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="Data rekomendasi belum ada -- jalankan scripts/build_location_allocation.py dulu.",
        )
    return json.loads(RECOMMENDATIONS_PATH.read_text(encoding="utf-8"))


@router.post("/chat/halte-recommendation", response_model=ChatResponse)
async def chat_halte_recommendation(body: ChatRequest) -> ChatResponse:
    collection = _load_recommendations()
    props = collection["properties"]
    features = collection["features"]

    system_instruction = SYSTEM_INSTRUCTION_TEMPLATE.format(
        method=props["method"],
        threshold=props["served_threshold_minutes"],
        total_population=props["total_demand_population"],
        already_served=props["already_served_population"],
        recommendations_json=json.dumps(features, ensure_ascii=False, indent=2),
    )

    try:
        reply = await generate_reply(system_instruction, body.message)
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    recommendations = [
        RecommendationSummary(
            rank=f["properties"]["rank"],
            kelurahan=f["properties"]["kelurahan"],
            population_gained=f["properties"]["population_gained"],
            nearest_existing_halte_m=f["properties"]["nearest_existing_halte_m"],
            cumulative_population_served=f["properties"]["cumulative_population_served"],
            cumulative_coverage_pct=f["properties"]["cumulative_coverage_pct"],
            coordinates=tuple(f["geometry"]["coordinates"]),
        )
        for f in features
    ]

    return ChatResponse(reply=reply, recommendations=recommendations)
