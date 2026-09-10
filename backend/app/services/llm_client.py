"""Thin wrapper around the DeepSeek chat-completions API (OpenAI-compatible).

Calls the API directly over HTTP rather than through an SDK -- the request and
response shape here is the standard OpenAI /chat/completions contract, so a
direct httpx call keeps the project free of SDK version pinning (same reasoning
as the Gemini client this replaces).

The client's role is unchanged: it never picks a location. It only turns the
already-computed, already-verified Location Allocation output into natural
language.
"""

import httpx

from app.config import settings

DEEPSEEK_MODEL = "deepseek-chat"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"


class LLMError(RuntimeError):
    pass


async def generate_reply(system_instruction: str, user_message: str) -> str:
    if not settings.deepseek_api_key:
        raise LLMError("DEEPSEEK_API_KEY belum diisi di backend/.env")

    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_message},
        ],
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                DEEPSEEK_URL,
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
                json=payload,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise LLMError(f"DeepSeek API error {exc.response.status_code}: {exc.response.text}") from exc
        except httpx.HTTPError as exc:
            # httpx timeout/connect errors often carry an empty str(), which
            # made this read as "Gagal menghubungi DeepSeek API: " with nothing
            # after it -- useless when the real cause was DNS/network.
            reason = str(exc) or type(exc).__name__
            raise LLMError(f"Gagal menghubungi DeepSeek API ({reason}). Cek koneksi internet.") from exc

    data = response.json()
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMError(f"Respons DeepSeek tidak sesuai format yang diharapkan: {data}") from exc
