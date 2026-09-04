"use client";

import { useEffect, useRef, useState } from "react";

import { sendChatMessage } from "@/lib/fetchChatReply";
import type { ChatMessage } from "@/types/chat";

interface ChatWidgetProps {
  /** Called when a reply carries recommendations, so the dashboard can
   * switch on the layer and fly the map to them. */
  onRecommendations?: (coordinates: [number, number][]) => void;
}

/**
 * Natural-language front end for the Location Allocation Model (see
 * backend/app/routers/chat.py) -- the PRD's "AI recommendation" feature.
 * Gemini only explains the model's already-computed output here; this widget
 * doesn't do anything with location data itself beyond displaying what the
 * backend returns.
 */
export default function ChatWidget({ onRecommendations }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, error]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const response = await sendChatMessage(text);
      setMessages((prev) => [...prev, { role: "assistant", text: response.reply }]);
      if (response.recommendations.length > 0) {
        onRecommendations?.(response.recommendations.map((r) => r.coordinates));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghubungi asisten.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Tutup asisten AI" : "Buka asisten rekomendasi halte"}
        className="absolute bottom-margin-page right-margin-page z-30 flex h-14 w-14 items-center justify-center rounded-full bg-transport-blue text-white shadow-lg transition-transform hover:scale-105"
      >
        <span className="material-symbols-outlined text-[26px]">{open ? "close" : "smart_toy"}</span>
      </button>

      {open && (
        <div className="absolute bottom-[92px] right-margin-page z-30 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-xl border border-border-low bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-border-low bg-transport-blue px-4 py-3">
            <span className="material-symbols-outlined text-[20px] text-white">smart_toy</span>
            <div>
              <p className="font-label-md text-label-md font-bold text-white">Asisten Rekomendasi Halte</p>
              <p className="text-[11px] text-white/80">Menjelaskan hasil Location Allocation Model</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto scrollbar-hide p-4">
            {messages.length === 0 && (
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Coba tanya: &quot;tolong rekomendasikan titik halte bus yang baru&quot;
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 font-label-sm text-label-sm ${
                  m.role === "user"
                    ? "self-end bg-transport-blue text-white"
                    : "self-start bg-surface-container text-on-surface"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="self-start rounded-lg bg-surface-container px-3 py-2 font-label-sm text-label-sm text-on-surface-variant">
                Mengetik...
              </div>
            )}
            {error && (
              <div className="self-start rounded-lg border border-alert-red bg-red-50 px-3 py-2 font-label-sm text-label-sm text-alert-red">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border-low p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Tanya soal rekomendasi halte..."
              className="flex-1 rounded-full border border-border-low bg-surface px-3 py-2 font-label-sm text-label-sm text-on-surface outline-none focus:border-transport-blue"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Kirim"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transport-blue text-white disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
