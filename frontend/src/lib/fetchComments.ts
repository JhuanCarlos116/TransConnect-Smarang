import type { CommentCreateInput, HalteComment } from "@/types/comment";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Per-halte comments -- see backend/app/routers/comment.py. Like tasks, these
 * are live mutable rows, so there's no static-file fallback.
 */
function requireApiBase(): string {
  if (!API_BASE_URL) {
    throw new Error(
      "Fitur komentar butuh backend lokal aktif. Set NEXT_PUBLIC_API_BASE_URL di frontend/.env.local, lalu jalankan `uvicorn app.main:app` di backend.",
    );
  }
  return API_BASE_URL;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Backend merespons status ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchComments(halteId: string): Promise<HalteComment[]> {
  const res = await fetch(`${requireApiBase()}/api/v1/halte/${halteId}/comments`);
  return parseOrThrow<HalteComment[]>(res);
}

export async function createComment(halteId: string, input: CommentCreateInput): Promise<HalteComment> {
  const res = await fetch(`${requireApiBase()}/api/v1/halte/${halteId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<HalteComment>(res);
}
