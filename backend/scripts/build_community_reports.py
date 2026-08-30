"""Derives placeholder "citizen report" (Community Maps) data from the
already-cleaned halte survey data.

Why this exists: the PRD's AI Integration flow (Section 7) is warga
melapor -> Automated QC + YOLOv8-seg memverifikasi -> laporan yang lolos
tampil di dashboard DISHUB. Real organic citizen participation doesn't
exist yet in this pilot, and YOLOv8 isn't built yet either. To demo the
*shape* of that pipeline now, the team reuses the 40-point survey (which
was already manually QA'd by the team, see manual_corrections.json) as
stand-in report data: each survey point becomes one "citizen report",
manual QA stands in for the not-yet-built YOLOv8 verification step, and
every report is therefore marked verified=True (they're real, checked
locations, not fabricated bad reports).

This is placeholder data for a demo, not real citizen input. Every
consumer of community-reports.geojson should keep that labeled clearly
(see PELAPOR_LABEL / VERIFIED_BY_LABEL below).

Run this AFTER clean_survey_export.py (it reads that script's output):
    python scripts/build_community_reports.py
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SURVEY_SOURCE = REPO_ROOT / "backend" / "data" / "processed" / "halte-survey.geojson"
PROCESSED_OUT = REPO_ROOT / "backend" / "data" / "processed" / "community-reports.geojson"
FRONTEND_OUT = REPO_ROOT / "frontend" / "public" / "data" / "community-reports.geojson"

PELAPOR_LABEL = "Tim Survei GOPEK (data contoh, bukan laporan warga asli)"
VERIFIED_BY_LABEL = "QA manual tim — placeholder untuk verifikasi otomatis YOLOv8"


def build_report_properties(halte_props: dict) -> dict:
    nama = halte_props["nama_halte"]
    deskripsi = halte_props.get("catatan_lapangan") or f"Laporan kondisi untuk {nama}."

    return {
        "report_id": halte_props["halte_id"],
        "judul": f"Laporan kondisi: {nama}",
        "deskripsi": deskripsi,
        "kelurahan": halte_props.get("kelurahan", "-"),
        "photo_url": halte_props.get("photo_url"),
        "pelapor": PELAPOR_LABEL,
        "tanggal_lapor": halte_props.get("survey_date"),
        "verification_status": "verified",
        "verified_by": VERIFIED_BY_LABEL,
    }


def build(survey_fc: dict) -> dict:
    features = [
        {
            "type": "Feature",
            "geometry": feature["geometry"],
            "properties": build_report_properties(feature["properties"]),
        }
        for feature in survey_fc["features"]
    ]
    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    if not SURVEY_SOURCE.exists():
        print(f"ERROR: {SURVEY_SOURCE} not found — run clean_survey_export.py first.")
        raise SystemExit(1)

    survey_fc = json.loads(SURVEY_SOURCE.read_text(encoding="utf-8"))
    report_fc = build(survey_fc)

    for out_path in (PROCESSED_OUT, FRONTEND_OUT):
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(report_fc, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Wrote {len(report_fc['features'])} community report(s) to {out_path}")


if __name__ == "__main__":
    main()
