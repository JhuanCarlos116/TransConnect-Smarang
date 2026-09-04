"""Thin wrapper around the Gemini REST API.

Calls the API directly over HTTP rather than through the google-genai SDK --
the exact request/response shape here (systemInstruction, contents, model
name) was verified against the live endpoint while building this, and a
direct httpx call avoids tying the project to a specific SDK version.
"""

import httpx

from app.config import settings

GEMINI_MODEL = "gemini-3.6-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


class GeminiError(RuntimeError):
    pass


async def generate_reply(system_instruction: str, user_message: str) -> str:
    if not settings.gemini_api_key:
        raise GeminiError("GEMINI_API_KEY belum diisi di backend/.env")

    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"parts": [{"text": user_message}]}],
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(GEMINI_URL, params={"key": settings.gemini_api_key}, json=payload)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise GeminiError(f"Gemini API error {exc.response.status_code}: {exc.response.text}") from exc
        except httpx.HTTPError as exc:
            raise GeminiError(f"Gagal menghubungi Gemini API: {exc}") from exc

    data = response.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise GeminiError(f"Respons Gemini tidak sesuai format yang diharapkan: {data}") from exc
