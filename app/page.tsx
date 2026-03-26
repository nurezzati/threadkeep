"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SavedThread } from "@/lib/supabase";

// ─── Tag Pill ─────────────────────────────────────────────────────────────────

function TagPill({
  tag,
  active,
  onClick,
  onRemove,
}: {
  tag: string;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] tracking-[0.15em] uppercase border transition-colors ${
        active
          ? "border-black bg-black text-white"
          : "border-gray-400 text-gray-600 hover:border-black hover:text-black"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {tag}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:text-red-500 transition-colors leading-none"
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

// ─── Tag Editor ───────────────────────────────────────────────────────────────

function TagEditor({
  threadId,
  tags,
  onChange,
}: {
  threadId: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const commit = async (newTags: string[]) => {
    onChange(newTags);
    const supabase = createClient();
    await supabase.from("threads").update({ tags: newTags }).eq("id", threadId);
  };

  const addTag = async () => {
    const tag = input.trim().toLowerCase();
    if (!tag || tags.includes(tag)) { setInput(""); setAdding(false); return; }
    await commit([...tags, tag]);
    setInput("");
    setAdding(false);
  };

  const removeTag = async (tag: string) => {
    await commit(tags.filter((t) => t !== tag));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
      ))}

      {adding ? (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTag(); }
            if (e.key === "Escape") { setAdding(false); setInput(""); }
          }}
          onBlur={addTag}
          placeholder="tag name…"
          className="text-[11px] tracking-[0.15em] uppercase border-b border-black outline-none w-24 text-black placeholder:text-gray-400 bg-transparent"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-[9px] tracking-[0.15em] uppercase text-gray-500 hover:text-black transition-colors"
        >
          + tag
        </button>
      )}
    </div>
  );
}

// ─── Thread Row ───────────────────────────────────────────────────────────────

function ThreadRow({
  thread,
  index,
  onTagsChange,
  onDelete,
}: {
  thread: SavedThread;
  index: number;
  onTagsChange: (id: string, tags: string[]) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const formattedDate = new Date(thread.saved_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleDelete = async () => {
    if (!confirm("Remove this thread?")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("threads").delete().eq("id", thread.id);
    onDelete(thread.id);
  };

  // Truncate URL: show up to 40 chars then …
  const shortUrl = thread.url.length > 48
    ? thread.url.slice(0, 48) + "…"
    : thread.url;

  return (
    <div
      className={`group grid grid-cols-[32px_1fr_auto] gap-4 px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        deleting ? "opacity-40 pointer-events-none" : ""
      }`}
      style={{ animation: `fadeUp 0.4s ease both`, animationDelay: `${index * 40}ms` }}
    >
      {/* Index */}
      <span className="text-[10px] text-gray-500 font-mono pt-0.5 select-none">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Content — three lines */}
      <div className="min-w-0 space-y-1">

        {/* Line 1: Description */}
        <p className="text-sm font-medium text-black leading-snug line-clamp-2">
          {thread.description || thread.title || "Untitled"}
        </p>

        {/* Line 2: Muted URL — clickable with underline on hover */}
        <a
          href={thread.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono text-gray-500 truncate hover:underline underline-offset-2 block"
        >
          {shortUrl}
        </a>

        {/* Line 3: Tags */}
        <div className="pt-0.5">
          <TagEditor
            threadId={thread.id}
            tags={thread.tags ?? []}
            onChange={(tags) => onTagsChange(thread.id, tags)}
          />
        </div>
      </div>

      {/* Meta + delete */}
      <div className="flex flex-col items-end justify-between shrink-0">
        <span className="text-[9px] text-gray-500 tracking-wide">
          {formattedDate}
        </span>
        <button
          onClick={handleDelete}
          className="text-[9px] tracking-[0.15em] uppercase text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <div className="text-[80px] font-light leading-none text-gray-100 select-none">
        {filtered ? "#" : "0"}
      </div>
      <p className="text-[10px] tracking-[0.35em] uppercase text-gray-600 font-medium">
        {filtered ? "No threads with this tag" : "No threads saved yet"}
      </p>
      {!filtered && (
        <p className="text-xs text-gray-500 max-w-xs text-center leading-relaxed">
          Paste a threads.com link above to save your first post.
        </p>
      )}
    </div>
  );
}

// ─── Paste Form ───────────────────────────────────────────────────────────────

type PasteStatus = "idle" | "unfurling" | "saving" | "saved" | "error";

function PasteForm({
  onSaved,
  allTags,
}: {
  onSaved: (thread: SavedThread) => void;
  allTags: string[];
}) {
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [status, setPasteStatus] = useState<PasteStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const trimmedUrl = url.trim();
  const isValidUrl =
    trimmedUrl.startsWith("http") &&
    (trimmedUrl.includes("threads.net") || trimmedUrl.includes("threads.com"));

  // Auto-unfurl when a valid URL is pasted
  const handleUrlChange = async (val: string) => {
    setUrl(val);
    setErrorMsg(null);
    const t = val.trim();
    const valid =
      t.startsWith("http") &&
      (t.includes("threads.net") || t.includes("threads.com"));
    if (!valid) return;

    setPasteStatus("unfurling");
    try {
      const res = await fetch(`/api/unfurl?url=${encodeURIComponent(t)}`);
      if (res.ok) {
        const meta = await res.json();
        setDesc(meta.description || meta.title || "");
      }
    } catch { /* non-fatal */ }
    setPasteStatus("idle");
  };

  const handleSave = async () => {
    if (status === "saving" || status === "unfurling") return;
    if (!isValidUrl) {
      setErrorMsg("Paste a valid threads.com link first.");
      return;
    }

    setPasteStatus("saving");
    setErrorMsg(null);

    // Resolve tag: prefer dropdown selection, fallback to new tag input
    const resolvedTag = (category !== "__new__" ? category : newTag.trim().toLowerCase()) || undefined;

    let meta = { title: null, description: null, image: null } as {
      title: string | null;
      description: string | null;
      image: string | null;
    };
    try {
      const res = await fetch(`/api/unfurl?url=${encodeURIComponent(trimmedUrl)}`);
      if (res.ok) meta = await res.json();
    } catch { /* non-fatal */ }

    const { saveThread } = await import("@/lib/supabase");
    const { data, error } = await saveThread(trimmedUrl, {
      title: meta.title ?? undefined,
      description: (desc || meta.description) ?? undefined,
      image: meta.image ?? undefined,
      tags: resolvedTag ? [resolvedTag] : [],
    });

    if (error || !data) {
      setPasteStatus("error");
      setErrorMsg(error?.message ?? "Could not save.");
      setTimeout(() => setPasteStatus("idle"), 5000);
      return;
    }

    onSaved(data);
    setUrl("");
    setDesc("");
    setCategory("");
    setNewTag("");
    setPasteStatus("saved");
    setTimeout(() => setPasteStatus("idle"), 2000);
  };



  return (
    <div className="">
      <div className="max-w-4xl mx-auto px-6 py-3">

        <div className="flex items-center gap-2">

          {/* ① Description */}
          <div className="flex-1 flex items-center border border-black px-4 h-9 min-w-0">
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Description or note…"
              className="flex-1 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-transparent min-w-0"
            />
            {desc && (
              <span className="text-[10px] text-gray-500 shrink-0 tabular-nums ml-2">
                {desc.length}
              </span>
            )}
          </div>

          {/* ② URL — muted, monospace */}
          <div className="w-44 shrink-0 flex items-center border border-black px-4 h-9">
            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="https://threads.com/…"
              className="w-full text-[11px] font-mono text-gray-500 placeholder:text-gray-400 focus:outline-none bg-transparent truncate"
            />
          </div>

          {/* ③ Category */}
          <div className="w-36 shrink-0 flex items-center border border-black px-4 h-9">
            {category === "__new__" ? (
              <input
                autoFocus
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onBlur={() => { if (!newTag.trim()) setCategory(""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") { setCategory(""); setNewTag(""); }
                }}
                placeholder="New tag…"
                className="w-full text-[11px] uppercase tracking-[0.15em] focus:outline-none bg-transparent placeholder:text-gray-400 text-black"
              />
            ) : (
              <div className="relative flex items-center w-full">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-[11px] uppercase tracking-[0.15em] text-gray-600 bg-transparent focus:outline-none cursor-pointer appearance-none pr-5"
                >
                  <option value="">Category</option>
                  {allTags.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="__new__">+ New…</option>
                </select>
                <svg className="pointer-events-none absolute right-0 w-3 h-3 text-gray-500 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </div>
            )}
          </div>

          {/* Save button — vertically centered beside the stack */}
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving" || status === "unfurling"}
            className="shrink-0 self-stretch border border-black px-6 text-[10px] tracking-[0.3em] uppercase font-semibold bg-black text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40"
          >
            {status === "saving" || status === "unfurling" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save"}
          </button>

        </div>

        {errorMsg && (
          <p className="mt-1.5 text-[10px] text-red-500 tracking-wide">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [threads, setThreads] = useState<SavedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);

      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .order("saved_at", { ascending: false });

      if (error) setError(error.message);
      else setThreads(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleTagsChange = (id: string, tags: string[]) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, tags } : t))
    );
  };

  const handleDelete = (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
  };

  // All unique tags across all threads
  const allTags = Array.from(
    new Set(threads.flatMap((t) => t.tags ?? []))
  ).sort();

  const filtered = activeTag
    ? threads.filter((t) => t.tags?.includes(activeTag))
    : threads;

  const count = filtered.length;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ── */}
      <header className="border-b border-black sticky top-0 bg-white z-30">
        <div className="max-w-4xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-[10px] tracking-[0.3em] uppercase font-medium text-gray-700">ThreadKeep</span>
          <div className="flex items-center gap-6">
            {userEmail && (
              <span className="hidden sm:block text-[9px] tracking-[0.15em] uppercase text-gray-500 truncate max-w-[160px]">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-[10px] tracking-[0.2em] uppercase text-gray-600 hover:text-black transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Title strip ── */}
      <div className="">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[9px] tracking-[0.35em] uppercase text-gray-600">Your collection</p>
            <h1 className="text-3xl font-light tracking-tight text-black leading-none">
              Saved Threads
              {!loading && (
                <span className="ml-3 text-base font-light text-gray-500">
                  {count}
                </span>
              )}
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-3 pb-1">
            <div className="w-12 h-[1px] bg-black" />
            <div className="w-2 h-2 border border-black" />
          </div>
        </div>
      </div>

      {/* ── Paste form ── */}
      <PasteForm onSaved={(t) => setThreads((prev) => [t, ...prev])} allTags={allTags} />

      {/* ── Tag filter bar ── */}
      {allTags.length > 0 && (
        <div className="border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] tracking-[0.25em] uppercase text-gray-700 mr-1">
              Filter
            </span>
            <TagPill
              tag="All"
              active={activeTag === null}
              onClick={() => setActiveTag(null)}
            />
            {allTags.map((tag) => (
              <TagPill
                key={tag}
                tag={tag}
                active={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── List ── */}
      <main className="max-w-4xl mx-auto">
        {error ? (
          <div className="px-6 py-8 space-y-1">
            <p className="text-[10px] tracking-[0.2em] uppercase text-red-500">Failed to load</p>
            <p className="text-xs text-gray-600">{error}</p>
          </div>
        ) : loading ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[32px_1fr] gap-4 px-6 py-5 border-b border-gray-100">
                <div className="h-2.5 w-5 bg-gray-100 animate-pulse mt-1" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 animate-pulse w-full" />
                  <div className="h-2 bg-gray-100 animate-pulse w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filtered={activeTag !== null} />
        ) : (
          filtered.map((thread, i) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              index={i}
              onTagsChange={handleTagsChange}
              onDelete={handleDelete}
            />
          ))
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-black mt-12">
        <div className="max-w-4xl mx-auto px-6 h-10 flex items-center justify-between">
          <span className="text-[9px] tracking-[0.25em] uppercase text-gray-700">ThreadKeep</span>
          <span className="text-[9px] tracking-[0.25em] uppercase text-gray-700">{new Date().getFullYear()}</span>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
