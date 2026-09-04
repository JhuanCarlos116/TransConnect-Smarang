import type { ChatApiResponse } from "@/types/chat";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Chatbot layer on top of the Location Allocation Model -- see
 * backend/app/routers/chat.py. Unlike the other fetch* helpers in this app
 * there is no static-file fallback: this genuinely needs the FastAPI backend
 * (with GEMINI_API_KEY configured) running, since it calls out to Gemini.
 */
export async function sendChatMessage(message: string): Promise<ChatApiResponse> {
  if (!API_BASE_URL) {
    throw new Error(
      "Fitur chat butuh backend lokal aktif. Set NEXT_PUBLIC_API_BASE_URL di frontend/.env.local, lalu jalankan `uvicorn app.main:app` di backend.",
    );
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/chat/halte-recommendation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Backend merespons status ${res.status}`);
  }

  return (await res.json()) as ChatApiResponse;
}
