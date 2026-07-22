"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-2xl border border-white/10 bg-[rgba(10,14,20,0.82)] p-8 shadow-2xl backdrop-blur">
        <h2 className="mb-3 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-6 text-sm leading-relaxed text-white/65">
          We hit an unexpected client-side error. You can retry loading the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
