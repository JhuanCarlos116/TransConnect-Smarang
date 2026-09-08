"use client";

import { useEffect, useState } from "react";

import { createComment, fetchComments } from "@/lib/fetchComments";
import type { HalteComment } from "@/types/comment";

interface CommentSectionProps {
  halteId: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

/**
 * Social-feed-style comments on a halte -- a deliberate exception to this
 * project's "don't fabricate what isn't real" rule (see AppHeader's history
 * note): the feature itself is real and live (backend/app/routers/comment.py),
 * it's just genuinely empty right now since there's no user base yet. Nothing
 * here is seeded or sample data.
 */
export default function CommentSection({ halteId }: CommentSectionProps) {
  const [comments, setComments] = useState<HalteComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchComments(halteId)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Gagal memuat komentar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [halteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !body.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createComment(halteId, { author_name: authorName.trim(), body: body.trim() });
      setComments((prev) => [created, ...prev]);
      setBody("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengirim komentar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 font-label-md text-[13px] font-bold text-on-surface">
        <span className="material-symbols-outlined text-[18px] text-transport-blue">forum</span>
        Komentar
      </h4>

      <form onSubmit={handleSubmit} className="mb-3 flex flex-col gap-2 rounded-lg border border-border-low bg-surface p-3">
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Nama kamu"
          maxLength={60}
          required
          className="w-full rounded-lg border border-border-low bg-surface-container-low p-2 font-body-md text-[13px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tulis komentar tentang halte ini..."
          maxLength={1000}
          required
          rows={2}
          className="w-full rounded-lg border border-border-low bg-surface-container-low p-2 font-body-md text-[13px] text-on-surface focus:border-transport-blue focus:outline-none focus:ring-1 focus:ring-transport-blue"
        />
        {submitError && <p className="text-label-sm text-alert-red">{submitError}</p>}
        <button
          type="submit"
          disabled={submitting || !authorName.trim() || !body.trim()}
          className="self-start rounded-lg bg-transport-blue px-3 py-1.5 font-label-sm text-label-sm font-bold text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Mengirim..." : "Kirim Komentar"}
        </button>
      </form>

      {loading && <p className="text-label-sm text-on-surface-variant">Memuat komentar...</p>}
      {loadError && <p className="text-label-sm text-alert-red">{loadError}</p>}
      {!loading && !loadError && comments.length === 0 && (
        <p className="text-label-sm text-on-surface-variant">Belum ada komentar. Jadilah yang pertama!</p>
      )}

      <div className="flex flex-col gap-2.5">
        {comments.map((c) => (
          <div key={c.comment_id} className="rounded-lg border border-border-low bg-surface-container-low p-2.5">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <span className="font-label-sm text-[12px] font-bold text-on-surface">{c.author_name}</span>
              <span className="text-[11px] text-on-surface-variant">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-[13px] leading-relaxed text-on-surface-variant">{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
