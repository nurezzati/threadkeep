"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type ClipboardPermission = "granted" | "denied" | "prompt" | "unknown";

export interface ClipboardObserverOptions {
  /** Only fire if detected URL matches this pattern (default: threads.net) */
  pattern?: RegExp;
  /** How long (ms) to suppress re-firing after a URL is handled (default: 60_000) */
  cooldownMs?: number;
}

export interface ClipboardObserverResult {
  /** The detected Threads URL, or null if none found yet */
  detectedUrl: string | null;
  /** Current clipboard permission state */
  permission: ClipboardPermission;
  /** Dismiss the detected URL without saving */
  dismiss: () => void;
  /** Manually trigger a clipboard check */
  checkNow: () => Promise<void>;
}

const THREADS_PATTERN = /https?:\/\/(www\.)?threads\.net\/[^\s"'<>]+/i;

export function useClipboardObserver(
  options: ClipboardObserverOptions = {}
): ClipboardObserverResult {
  const { pattern = THREADS_PATTERN, cooldownMs = 60_000 } = options;

  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [permission, setPermission] = useState<ClipboardPermission>("unknown");

  // Track URLs we've already surfaced so we don't re-prompt for the same link
  const seenRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<number>(0);

  const readClipboard = useCallback(async (): Promise<string | null> => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return null;

    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (err) {
      // NotAllowedError → permission denied or not yet granted
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPermission("denied");
      }
      return null;
    }
  }, []);

  const checkPermission = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    try {
      // clipboard-read is not universally supported; catch TypeScript's complaint
      const status = await navigator.permissions.query({
        name: "clipboard-read" as PermissionName,
      });
      setPermission(status.state as ClipboardPermission);
      status.onchange = () => {
        setPermission(status.state as ClipboardPermission);
      };
    } catch {
      setPermission("unknown");
    }
  }, []);

  const checkNow = useCallback(async () => {
    const now = Date.now();
    // Respect cooldown to avoid hammering the API
    if (now - lastCheckRef.current < 800) return;
    lastCheckRef.current = now;

    const text = await readClipboard();
    if (!text) return;

    const match = text.match(pattern);
    if (!match) return;

    const url = match[0];

    // Cooldown: don't re-surface a URL within the cooldown window
    if (seenRef.current.has(url)) return;

    setDetectedUrl(url);
    // Mark as seen; auto-clear after cooldown so user can re-save later
    seenRef.current.add(url);
    setTimeout(() => seenRef.current.delete(url), cooldownMs);
  }, [pattern, cooldownMs, readClipboard]);

  const dismiss = useCallback(() => {
    setDetectedUrl(null);
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    const onFocus = () => {
      checkNow();
    };

    window.addEventListener("focus", onFocus);
    // Also check on visibility change (e.g. switching tabs on mobile)
    const onVisible = () => {
      if (document.visibilityState === "visible") checkNow();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkNow]);

  return { detectedUrl, permission, dismiss, checkNow };
}
