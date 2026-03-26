"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

type LoginStatus = "idle" | "sending" | "sent" | "error";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<LoginStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Show error if redirected back from a failed auth callback
  useEffect(() => {
    if (params.get("error") === "auth_failed") {
      setStatus("error");
      setErrorMsg("Authentication failed. Please try again.");
    }
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "sending") return;

    setStatus("sending");
    setErrorMsg(null);

    const supabase = createClient();
    const next = params.get("next") ?? "/";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setStatus("sent");
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="mb-12 space-y-1">
          <p className="text-[9px] tracking-[0.4em] uppercase text-gray-400">
            Welcome to
          </p>
          <h1 className="text-2xl font-light tracking-tight text-black">
            ThreadKeep
          </h1>
          <div className="w-8 h-[1px] bg-black mt-2" />
        </div>

        {/* Card */}
        <div className="border border-black">

          {/* Header */}
          <div className="border-b border-black px-6 py-4 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.25em] uppercase font-medium text-black">
              Sign In
            </span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-gray-400">
              Magic Link
            </span>
          </div>

          {/* Body */}
          <div className="px-6 py-8">
            {status === "sent" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border border-black flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="1,6 4,9 11,2" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-black">Check your email</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  A sign-in link was sent to{" "}
                  <span className="text-black font-medium">{email}</span>.
                  Click it to continue — no password needed.
                </p>
                <button
                  onClick={() => { setStatus("idle"); setEmail(""); }}
                  className="text-[10px] tracking-[0.2em] uppercase text-gray-400 hover:text-black transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-[9px] tracking-[0.3em] uppercase text-gray-400 font-medium"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full border border-black px-3 py-2.5 text-sm text-black placeholder:text-gray-300 focus:outline-none focus:ring-0 focus:border-black bg-white"
                  />
                </div>

                {/* Error */}
                {status === "error" && errorMsg && (
                  <p className="text-[10px] tracking-[0.1em] text-red-500">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending" || !email}
                  className="w-full border border-black py-3 text-[11px] tracking-[0.25em] uppercase font-medium bg-black text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? "Sending…" : "Send Magic Link"}
                </button>

                <p className="text-[9px] text-gray-400 leading-relaxed text-center">
                  We&apos;ll email you a sign-in link.
                  <br />No password required.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
