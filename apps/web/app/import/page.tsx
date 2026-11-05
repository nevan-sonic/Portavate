import type { Metadata } from "next";
import { MemoryReview } from "./review";

export const metadata: Metadata = { title: "Import Memory" };

export default function ImportMemory() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="mb-2 text-xs font-bold tracking-widest text-accent uppercase">Workspace / Memory</p>
        <h1 className="text-4xl font-semibold tracking-tight">Import Memory</h1>
        <p className="mt-3 max-w-2xl text-muted">Extract draft claims with 0G Private Computer, then compare each claim against its source before approving it.</p>
      </header>
      <MemoryReview />
    </div>
  );
}
