"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-6">
      <h1 className="text-xl font-semibold">Workspace unavailable</h1>
      <p className="my-3 text-muted">There was a problem loading this page.</p>
      <button onClick={reset} className="rounded-lg bg-tint px-4 py-2 font-semibold text-accent">Try again</button>
    </section>
  );
}
