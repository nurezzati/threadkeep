"use client";

import { useEffect, useRef, useState } from "react";
import { useClipboardObserver } from "@/hooks/useClipboardObserver";
import { saveThread } from "@/lib/supabase";
// saveThread uses the browser client internally — no changes needed here

type DrawerState = "idle" | "visible" | "saving" | "saved" | "error";

export function ClipboardActionDrawer() {
  const { detectedUrl, permission, dismiss } = useClipboardObserver();
  const [drawerState, setDrawerState] = useState<DrawerState>("idle");
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show drawer whenever a new URL is detected
  useEffect(() => {
    if (detectedUrl) {
      setActiveUrl(detectedUrl);
      setDrawerState("visible");
    }
  }, [detectedUrl]);

  // Auto-dismiss after 8 s if the user ignores it
  useEffect(() => {
    if (drawerState === "visible") {
      timerRef.current = setTimeout(() => handleDismiss(), 8000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerState]);

  const handleDismiss = () => {
    setDrawerState("idle");
    dismiss();
    setTimeout(() => setActiveUrl(null), 400); // wait for exit animation
  };

  const handleSave = async () => {
    if (!activeUrl) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    setDrawerState("saving");

    const { error } = await saveThread(activeUrl);

    if (error) {
      setDrawerState("error");
      setTimeout(handleDismiss, 2500);
      return;
    }

    setDrawerState("saved");
    setTimeout(handleDismiss, 1800);
  };

  // Don't render anything if clipboard access is explicitly denied
  if (permission === "denied") return null;

  const isVisible = drawerState !== "idle";

  return (
    <>
      {/* Backdrop blur — only on mobile feel */}
      <div
        aria-hidden
        className={`fixed inset-0 bg-black/10 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleDismiss}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="Save thread from clipboard"
        aria-live="polite"
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Top handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-[2px] bg-gray-300" />
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Label row */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] tracking-[0.25em] uppercase text-gray-400 font-medium">
                Clipboard detected
              </p>
              <p className="text-sm font-medium text-black truncate">
                {drawerState === "saved"
                  ? "Thread saved."
                  : drawerState === "error"
                  ? "Could not save. Try again."
                  : "Save thread from clipboard?"}
              </p>
              {activeUrl && drawerState === "visible" && (
                <p className="text-[10px] font-mono text-gray-400 truncate">
                  {activeUrl}
                </p>
              )}
            </div>

            {/* Close button */}
            {(drawerState === "visible" || drawerState === "error") && (
              <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="mt-0.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-black transition-colors shrink-0"
              >
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="1" y1="1" x2="11" y2="11" />
                  <line x1="11" y1="1" x2="1" y2="11" />
                </svg>
              </button>
            )}
          </div>

          {/* Actions */}
          {drawerState === "visible" && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 border border-black py-3 text-[11px] tracking-[0.2em] uppercase font-medium bg-black text-white hover:bg-white hover:text-black transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 border border-black py-3 text-[11px] tracking-[0.2em] uppercase font-medium text-black hover:bg-black hover:text-white transition-colors"
              >
                Ignore
              </button>
            </div>
          )}

          {/* Saving state */}
          {drawerState === "saving" && (
            <div className="w-full h-[1px] bg-gray-100 overflow-hidden">
              <div className="h-full bg-black w-1/2 animate-pulse" />
            </div>
          )}

          {/* Saved checkmark */}
          {drawerState === "saved" && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-black flex items-center justify-center">
                <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="1,6 4,9 11,2" />
                </svg>
              </div>
              <span className="text-xs text-gray-400">Added to library</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
