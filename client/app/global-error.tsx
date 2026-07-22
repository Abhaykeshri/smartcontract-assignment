"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-2xl border border-white/10 bg-[rgba(10,14,20,0.82)] p-8 shadow-2xl backdrop-blur">
            <h2 className="mb-3 text-xl font-semibold">Application error</h2>
            <p className="mb-6 text-sm leading-relaxed text-white/65">
              The app hit a fatal rendering error. Try reloading the page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
