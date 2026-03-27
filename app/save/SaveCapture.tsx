"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { saveThread } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";

type CaptureStatus = "detecting" | "unfurling" | "confirm" | "saving" | "done" | "error";

interface OGMeta {
  title: string | null;
  description: string | null;
  image: string | null;
}

function SkeletonLine({ width }: { width: string }) {
  return <div className="h-3 bg-gray-100 animate-pulse" style={{ width }} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <div className="w-full h-48 bg-gray-100 animate-pulse" />
      <div className="space-y-2 pt-2">
        <SkeletonLine width="80%" />
        <SkeletonLine width="60%" />
      </div>
      <div className="space-y-2 pt-1">
        <SkeletonLine width="100%" />
        <SkeletonLine width="100%" />
        <SkeletonLine width="45%" />
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<CaptureStatus, string> = {
  detecting: "Detecting URL…",
  unfurling: "Fetching preview…",
  confirm: "Review before saving.",
  saving: "Saving thread…",
  done: "Saved.",
  error: "Something went wrong.",
};

export function SaveCapture() {
  const params = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<CaptureStatus>("detecting");
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<OGMeta | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editTag, setEditTag] = useState("");
  const [newTag, setNewTag] = useState("");
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("threads").select("tags").then(({ data }) => {
      if (data) {
        const tags = Array.from(new Set(data.flatMap((r) => r.tags ?? []))).sort();
        setExistingTags(tags);
      }
    });
  }, []);

  useEffect(() => {
    const rawUrl =
      params.get("url") || params.get("text") || params.get("title");

    if (!rawUrl) {
      setStatus("error");
      setErrorMsg("No URL was received.");
      return;
    }

    try {
      const parsed = new URL(rawUrl);
      if (!parsed.hostname.endsWith("threads.net") && !parsed.hostname.endsWith("threads.com")) {
        setStatus("error");
        setErrorMsg("Only Threads links are supported.");
        return;
      }
    } catch {
      setStatus("error");
      setErrorMsg("Invalid URL.");
      return;
    }

    setUrl(rawUrl);

    async function run(link: string) {
      setStatus("unfurling");
      let ogMeta: OGMeta = { title: null, description: null, image: null };

      try {
        const res = await fetch(`/api/unfurl?url=${encodeURIComponent(link)}`);
        if (res.ok) {
          ogMeta = await res.json();
          setMeta(ogMeta);
        }
      } catch {
        // Non-fatal — save bare URL
      }

      setEditDesc(ogMeta.description ?? ogMeta.title ?? "");
      setStatus("confirm");
    }

    run(rawUrl);
  }, [params, router]);

  const handleSave = async () => {
    if (!url) return;
    setStatus("saving");
    const { error } = await saveThread(url, {
      title: meta?.title ?? undefined,
      description: editDesc || undefined,
      image: meta?.image ?? undefined,
      tags: editTag === "__new__" ? (newTag.trim() ? [newTag.trim().toLowerCase()] : []) : editTag ? [editTag] : [],
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("done");
    setTimeout(() => router.push("/"), 1800);
  };

  const isDone = status === "done";
  const isError = status === "error";
  const isConfirm = status === "confirm";
  const isLoading = !isDone && !isError && !isConfirm;

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm border border-black">
        {/* Header */}
        <div className="border-b border-black px-6 py-4 flex items-center justify-between">
          <span className="text-[10px] tracking-[0.25em] uppercase font-medium text-black">
            ThreadKeep
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-gray-400">
            Capture
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-8 space-y-6">
          <p
            className="text-[11px] tracking-[0.2em] uppercase font-medium text-black"
          >
            {isError ? errorMsg : STATUS_LABELS[status]}
          </p>

          {isConfirm && (
            <div className="space-y-3">
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                placeholder="Add a description…"
                className="w-full text-xs text-black bg-white border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:border-black placeholder:text-gray-400"
              />
              {editTag === "__new__" ? (
                <input
                  autoFocus
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onBlur={() => { if (!newTag.trim()) setEditTag(""); }}
                  onKeyDown={(e) => { if (e.key === "Escape") { setEditTag(""); setNewTag(""); } }}
                  placeholder="New category…"
                  className="w-full border border-gray-200 px-3 h-10 text-xs font-sans text-black focus:outline-none focus:border-black placeholder:text-gray-400"
                />
              ) : (
                <div className="relative flex items-center border border-gray-200 px-3 h-10 focus-within:border-black transition-colors">
                  <select
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="w-full text-xs font-sans text-black bg-transparent focus:outline-none appearance-none cursor-pointer pr-5"
                  >
                    <option value="">Category</option>
                    {existingTags.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="__new__">+ New…</option>
                  </select>
                  <svg className="pointer-events-none absolute right-3 w-3 h-3 text-gray-500 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4l4 4 4-4" />
                  </svg>
                </div>
              )}
              <button
                onClick={handleSave}
                className="w-full h-10 border border-black bg-black text-white text-[10px] tracking-[0.3em] uppercase font-semibold hover:bg-white hover:text-black transition-colors"
              >
                Save
              </button>
            </div>
          )}

          {isLoading && !meta && <LoadingSkeleton />}

          {meta && (
            <div className="space-y-4">
              {meta.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={meta.image}
                  alt=""
                  className="w-full h-48 object-cover"
                />
              )}
              {meta.title && (
                <p className="text-sm font-medium text-black leading-snug">
                  {meta.title}
                </p>
              )}
              {meta.description && (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                  {meta.description}
                </p>
              )}
            </div>
          )}

          {url && (
            <p className="text-[10px] text-black font-mono truncate">{url}</p>
          )}

          {isLoading && (
            <div className="w-full h-[1px] bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-black"
                style={{
                  animation: "tkProgress 1.4s ease-in-out infinite",
                }}
              />
            </div>
          )}

          {isDone && (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border border-black flex items-center justify-center">
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polyline points="1,6 4,9 11,2" />
                </svg>
              </div>
              <span className="text-xs text-gray-500">
                Redirecting to library…
              </span>
            </div>
          )}

          {isError && (
            <button
              onClick={() => router.push("/")}
              className="text-[10px] tracking-[0.2em] uppercase border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
            >
              Go Home
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tkProgress {
          0%   { width: 0%;   margin-left: 0%;   }
          50%  { width: 60%;  margin-left: 20%;  }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>
    </main>
  );
}
