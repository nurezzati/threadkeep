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
  onUpdate,
}: {
  thread: SavedThread;
  index: number;
  onTagsChange: (id: string, tags: string[]) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<SavedThread>) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(thread.notes ?? "");

  const formattedDate = new Date(thread.saved_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const supabase = createClient();

  const handleDelete = async () => {
    if (!confirm("Remove this thread?")) return;
    setDeleting(true);
    await supabase.from("threads").delete().eq("id", thread.id);
    onDelete(thread.id);
  };

  const toggleRead = async () => {
    const is_read = !thread.is_read;
    await supabase.from("threads").update({ is_read }).eq("id", thread.id);
    onUpdate(thread.id, { is_read });
  };

  const saveNote = async () => {
    setEditingNote(false);
    if (note === (thread.notes ?? "")) return;
    await supabase.from("threads").update({ notes: note || null }).eq("id", thread.id);
    onUpdate(thread.id, { notes: note || null });
  };

  const shortUrl = thread.url.length > 48
    ? thread.url.slice(0, 48) + "…"
    : thread.url;

  return (
    <div
      className={`group grid grid-cols-[20px_1fr_auto] gap-4 px-6 py-4 border-b border-gray-100 transition-colors ${
        thread.is_read ? "bg-gray-50/60" : "hover:bg-gray-50"
      } ${deleting ? "opacity-40 pointer-events-none" : ""}`}
      style={{ animation: `fadeUp 0.4s ease both`, animationDelay: `${index * 40}ms` }}
    >
      {/* Read toggle dot */}
      <button
        onClick={toggleRead}
        title={thread.is_read ? "Mark unread" : "Mark read"}
        className="mt-1 shrink-0 w-2 h-2 rounded-full border transition-colors self-start"
        style={{
          borderColor: thread.is_read ? "#d1d5db" : "#000",
          backgroundColor: thread.is_read ? "#d1d5db" : "#000",
        }}
      />

      {/* Content */}
      <div className="min-w-0 space-y-1">

        {/* Line 1: Description */}
        <p className={`text-sm font-medium leading-snug line-clamp-2 ${thread.is_read ? "text-gray-400" : "text-black"}`}>
          {thread.description || thread.title || "Untitled"}
        </p>

        {/* Line 2: Muted URL */}
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

        {/* Line 4: Notes */}
        <div className="pt-1">
          {editingNote ? (
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              onKeyDown={(e) => { if (e.key === "Escape") saveNote(); }}
              rows={2}
              placeholder="Add a note…"
              className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1.5 resize-none focus:outline-none focus:border-black placeholder:text-gray-400"
            />
          ) : (
            <button
              onClick={() => setEditingNote(true)}
              className={`text-xs text-left block w-full transition-colors ${
                note
                  ? "text-gray-600 hover:text-black"
                  : "text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100"
              }`}
            >
              {note || "Add note…"}
            </button>
          )}
        </div>
      </div>

      {/* Meta + delete */}
      <div className="flex flex-col items-end justify-between shrink-0 min-w-[60px]">
        <span className="text-[9px] text-gray-500 tracking-wide whitespace-nowrap">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">

        {/* Mobile: stacked — Desktop: single row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">

          {/* ① URL */}
          <div className="flex-1 flex items-center border border-black px-3 min-w-0" style={{ height: '48px' }}>
            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="https://threads.com/…"
              className="w-full text-xs font-mono text-gray-600 placeholder:text-gray-400 focus:outline-none bg-transparent truncate"
            />
          </div>

          {/* ② Description */}
          <div className="flex-1 flex items-center border border-black px-3 min-w-0" style={{ height: '48px' }}>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Description or notes…"
              className="flex-1 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-transparent min-w-0"
            />
            {desc && (
              <span className="text-[10px] text-gray-500 shrink-0 tabular-nums ml-2">
                {desc.length}
              </span>
            )}
          </div>

          {/* ③ Category + Save row on mobile */}
          <div className="flex items-center gap-2">

            <div className="flex-1 sm:w-36 sm:flex-none flex items-center border border-black px-3" style={{ height: '48px' }}>
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

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "saving" || status === "unfurling"}
              style={{ height: '48px' }}
              className="shrink-0 border border-black px-5 text-[10px] tracking-[0.3em] uppercase font-semibold bg-black text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40"
            >
              {status === "saving" || status === "unfurling" ? "…" : status === "saved" ? "✓" : "Save"}
            </button>

          </div>
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

type SortOrder = "newest" | "oldest";

export default function LibraryPage() {
  const [threads, setThreads] = useState<SavedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
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
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, tags } : t)));
  };

  const handleDelete = (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdate = (id: string, patch: Partial<SavedThread>) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  // All unique tags
  const allTags = Array.from(
    new Set(threads.flatMap((t) => t.tags ?? []))
  ).sort();

  // Apply filters + search + sort
  const filtered = threads
    .filter((t) => !activeTag || t.tags?.includes(activeTag))
    .filter((t) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.description?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.url.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const diff = new Date(a.saved_at).getTime() - new Date(b.saved_at).getTime();
      return sort === "newest" ? -diff : diff;
    });

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

      {/* ── Search + Sort + Filter toolbar ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">

          {/* Search */}
          <div className="flex-1 min-w-[180px] flex items-center border border-gray-200 px-3 h-8 gap-2 focus-within:border-black transition-colors">
            <svg className="w-3 h-3 text-gray-400 shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="5" cy="5" r="3.5" /><path d="M8 8l2.5 2.5" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threads…"
              className="flex-1 text-xs text-black placeholder:text-gray-400 focus:outline-none bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-black text-xs leading-none">×</button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 shrink-0">
            {(["newest", "oldest"] as SortOrder[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border transition-colors ${
                  sort === s ? "border-black bg-black text-white" : "border-gray-200 text-gray-500 hover:border-black hover:text-black"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <span className="text-[9px] tracking-[0.25em] uppercase text-gray-500">Tag</span>
              <TagPill tag="All" active={activeTag === null} onClick={() => setActiveTag(null)} />
              {allTags.map((tag) => (
                <TagPill key={tag} tag={tag} active={activeTag === tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} />
              ))}
            </div>
          )}

        </div>
      </div>

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
          <EmptyState filtered={activeTag !== null || search.length > 0} />
        ) : (
          filtered.map((thread, i) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              index={i}
              onTagsChange={handleTagsChange}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
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
