import { Suspense } from "react";
import { SaveCapture } from "./SaveCapture";

export default function SavePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm border border-black">
            <div className="border-b border-black px-6 py-4 flex items-center justify-between">
              <span className="text-[10px] tracking-[0.25em] uppercase font-medium text-black">
                ThreadKeep
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-gray-400">
                Capture
              </span>
            </div>
            <div className="px-6 py-8 space-y-6">
              <p className="text-[11px] tracking-[0.2em] uppercase font-medium text-gray-400">
                Detecting URL…
              </p>
              <div className="space-y-4 w-full">
                <div className="w-full h-48 bg-gray-100 animate-pulse" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 bg-gray-100 animate-pulse" style={{ width: "80%" }} />
                  <div className="h-3 bg-gray-100 animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <SaveCapture />
    </Suspense>
  );
}
