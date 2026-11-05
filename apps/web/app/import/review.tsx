"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { MemoryItem, MemoryPackage } from "@portavate/memory-core";
import { sourceByteLimit } from "@portavate/memory-core/import";
import type { ImportInput, ReviewInput, SourceSegment } from "@portavate/memory-core/import";

type Draft = {
  package: MemoryPackage;
  revision: number;
  quotes: Record<string, string>;
  inference: {
    model: string;
    requestId: string;
    requestedTrustMode: string;
    timestamp: string;
    routerReportedTeeVerified?: boolean;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };
};
type Saved = { id: string; name: string; extracted: boolean };
const panel = "rounded-2xl border border-line bg-panel p-5 sm:p-6";
const field = "w-full rounded-lg border border-line bg-canvas p-2.5 text-ink";
const button = "rounded-lg bg-tint px-4 py-2 font-semibold text-accent disabled:opacity-50";
const kinds = ["fact", "decision", "preference", "requirement", "constraint", "completed_task", "pending_task", "known_issue"] as const;
const humanize = (value: string) => value.replaceAll("_", " ");

async function api<T>(path: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch("/api/memory/" + path, {
    method, cache: "no-store",
    ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? "The request failed. Check the local API and try again.");
  return result as T;
}

function ReviewItem({ item, quote, busy, onSave, packageId }: {
  item: MemoryItem; quote: string; busy: boolean; packageId: string;
  onSave: (decision: Omit<ReviewInput, "revision">) => Promise<void>;
}) {
  const [content, setContent] = useState(item.content);
  const [visibility, setVisibility] = useState(item.visibility);
  const [sensitivity, setSensitivity] = useState(item.sensitivity);
  const [passage, setPassage] = useState<SourceSegment>();
  const [evidenceMessage, setEvidenceMessage] = useState("");
  async function loadEvidence() {
    setEvidenceMessage("Loading source passage…");
    try {
      setPassage(await api<SourceSegment>(`sources/${packageId}/evidence/${item.source.locator}`));
      setEvidenceMessage("");
    } catch { setEvidenceMessage("Source passage unavailable. Try again."); }
  }
  const save = (reviewStatus: MemoryItem["reviewStatus"]) => onSave({ content, visibility, sensitivity, reviewStatus });
  return (
    <article className={panel}>
      <p className="mb-3 text-xs font-bold tracking-wide text-accent uppercase">{humanize(item.type)} · {item.importance} · {item.reviewStatus}</p>
      <label className="block text-sm font-semibold">Claim
        <textarea className={field + " mt-1"} rows={3} maxLength={2000} value={content} onChange={(event) => setContent(event.target.value)} />
      </label>
      <p className="mt-3 text-xs font-semibold text-muted">Original source quote · recheck after editing</p>
      <blockquote className="mt-3 whitespace-pre-wrap break-words rounded-lg border-l-4 border-accent bg-canvas p-3 text-sm text-muted">{quote}</blockquote>
      <button type="button" className="my-2 text-sm font-semibold text-accent underline" onClick={() => passage ? setPassage(undefined) : void loadEvidence()}>{passage ? "Hide source passage" : "Inspect source passage"} · {item.source.locator}</button>
      {evidenceMessage && <p role="status" className="text-sm text-muted">{evidenceMessage}</p>}
      {passage && <div className="max-h-48 overflow-auto rounded-lg border border-line p-3 text-sm"><p className="font-semibold">{passage.label}</p><p className="whitespace-pre-wrap break-words">{passage.text}</p></div>}
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Visibility<select className={field + " mt-1"} value={visibility} onChange={(event) => setVisibility(event.target.value as MemoryItem["visibility"])}><option value="owner_only">Owner only</option><option value="scoped">Scoped</option></select></label>
        <label className="text-sm">Sensitivity<select className={field + " mt-1"} value={sensitivity} onChange={(event) => setSensitivity(event.target.value as MemoryItem["sensitivity"])}><option value="normal">Normal</option><option value="sensitive">Sensitive</option></select></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={busy || !content.trim()} onClick={() => void save("pending")}>Save edit for review</button>
        <button className={button} disabled={busy || !content.trim()} onClick={() => void save("approved")}>Approve</button>
        <button className={button} disabled={busy || !content.trim()} onClick={() => void save("rejected")}>Reject</button>
      </div>
    </article>
  );
}

export function MemoryReview() {
  const [source, setSource] = useState<ImportInput>({ name: "Pasted conversation", format: "txt", text: "", sourceType: "chatbot", sensitive: true });
  const [saved, setSaved] = useState<Saved[]>([]);
  const [draft, setDraft] = useState<Draft>();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let mounted = true;
    api<{ sources: Saved[] }>("sources").then(
      ({ sources }) => { if (mounted) setSaved(sources); },
      (error: Error) => { if (mounted) setMessage(error.message); },
    );
    return () => { mounted = false; };
  }, []);

  async function perform(label: string, action: () => Promise<void>) {
    setBusy(label);
    setMessage("");
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(""); }
  }

  function upload(file: File | undefined) {
    if (!file) return;
    void perform("Reading file…", async () => {
      const format = file.name.split(".").pop()?.toLowerCase();
      if (format !== "txt" && format !== "md" && format !== "json") throw new Error("Choose a .txt, .md, or .json file.");
      if (file.size > sourceByteLimit) throw new Error("Source must be 16 KiB or smaller.");
      const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer());
      setSource((previous) => ({ ...previous, text, format, name: file.name.slice(0, 120) }));
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await perform("Extracting with 0G…", async () => {
      if (new TextEncoder().encode(source.text).length > sourceByteLimit) throw new Error("Source must be 16 KiB or smaller.");
      const { id } = await api<{ id: string }>("sources", "POST", source);
      setSaved((previous) => [{ id, name: source.name, extracted: false }, ...previous]);
      setSource((previous) => ({ ...previous, text: "" }));
      setDraft(undefined);
      setDraft(await api<Draft>(`sources/${id}/extractions`, "POST"));
      setSaved((previous) => previous.map((entry) => entry.id === id ? { ...entry, extracted: true } : entry));
    });
  }

  const approved = draft?.package.items.filter((item) => item.reviewStatus === "approved") ?? [];
  return (
    <div className="space-y-5">
      <form onSubmit={(event) => void submit(event)} className={panel + " space-y-4"}>
        <h2 className="text-xl font-semibold">Add a source</h2>
        <p className="text-sm text-muted">Paste content you are authorized to share or upload a UTF-8 text, Markdown, or conversation JSON file up to 16 KiB. Imports and reviews are saved unencrypted on this computer.</p>
        <label className="block text-sm font-semibold">Upload file<input type="file" accept=".txt,.md,.json" disabled={!!busy} className={field + " mt-1"} onChange={(event) => { upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Format<select className={field + " mt-1"} value={source.format} onChange={(event) => setSource({ ...source, format: event.target.value as ImportInput["format"] })}><option value="txt">Plain text</option><option value="md">Markdown</option><option value="json">Conversation JSON</option></select></label>
          <label className="text-sm">Source assistant<select className={field + " mt-1"} value={source.sourceType} onChange={(event) => setSource({ ...source, sourceType: event.target.value as ImportInput["sourceType"] })}><option value="chatbot">Chatbot</option><option value="coding_agent">Coding agent</option></select></label>
        </div>
        <label className="block text-sm">Source text<textarea rows={7} className={field + " mt-1"} value={source.text} onChange={(event) => setSource({ ...source, text: event.target.value })} /></label>
        {source.format === "json" && <p className="break-words font-mono text-xs text-muted">{'{"messages":[{"role":"user","content":"Use SQLite for the alpha."}]}'}</p>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={source.sensitive} onChange={(event) => setSource({ ...source, sensitive: event.target.checked })} /> Sensitive source · require private routing</label>
        <button className={button} disabled={!!busy || !source.text.trim()}>Import and extract</button>
      </form>
      {busy && <p role="status" className="text-sm text-muted">{busy}</p>}
      {message && <p role="alert" className={panel + " text-sm"}>{message}</p>}
      <section className={panel}>
        <h2 className="text-lg font-semibold">Saved imports</h2>
        {saved.length ? <ul className="mt-2 divide-y divide-line">{saved.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="break-all text-sm">{entry.name}</span>
            <button className={button} disabled={!!busy} onClick={() => void perform(entry.extracted ? "Opening draft…" : "Extracting with 0G…", async () => {
              setDraft(await api<Draft>(entry.extracted ? `drafts/${entry.id}` : `sources/${entry.id}/extractions`, entry.extracted ? "GET" : "POST"));
              setSaved((previous) => previous.map((item) => item.id === entry.id ? { ...item, extracted: true } : item));
            })}>{entry.extracted ? "Open draft" : "Extract"}</button>
          </li>
        ))}</ul> : <p className="mt-2 text-sm text-muted">Saved sources and drafts will appear here.</p>}
      </section>
      {draft && <>
        <section className={panel}>
          <h2 className="text-xl font-semibold">Review draft</h2>
          <p className="mt-2 text-sm text-muted">Inference returned validated structured output. Check whether each quoted passage supports its claim before approving it.</p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold">Model</dt><dd>{draft.inference.model}</dd></div>
            <div><dt className="font-semibold">Requested trust mode</dt><dd>{draft.inference.requestedTrustMode}</dd></div>
            <div><dt className="font-semibold">Router request ID</dt><dd className="break-all font-mono text-xs">{draft.inference.requestId}</dd></div>
            <div><dt className="font-semibold">Router-reported TEE verification</dt><dd>{draft.inference.routerReportedTeeVerified === undefined ? "Unreported" : draft.inference.routerReportedTeeVerified ? "Reported verified" : "Reported unverified"}</dd></div>
            <div><dt className="font-semibold">Timestamp</dt><dd>{draft.inference.timestamp}</dd></div>
            {draft.inference.usage && <div><dt className="font-semibold">Usage</dt><dd>{draft.inference.usage.prompt_tokens} input · {draft.inference.usage.completion_tokens} output · {draft.inference.usage.total_tokens} total tokens</dd></div>}
          </dl>
          <label className="mt-4 block text-sm">Filter by type<select className={field + " mt-1"} value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All types</option>{kinds.map((kind) => <option key={kind} value={kind}>{humanize(kind)}</option>)}</select></label>
        </section>
        {draft.package.items.filter((item) => filter === "all" || item.type === filter).map((item) => (
          <ReviewItem key={item.id + item.updatedAt} item={item} quote={draft.quotes[item.id]} busy={!!busy} packageId={draft.package.packageId}
            onSave={(decision) => perform("Saving review…", async () => {
              setDraft(await api<Draft>(`drafts/${draft.package.packageId}/items/${item.id}`, "PATCH", { ...decision, revision: draft.revision }));
            })} />
        ))}
        <section className={panel}>
          <h2 className="text-lg font-semibold">Approved package preview · {approved.length} items</h2>
          <p className="mt-2 text-sm text-muted">Only approved claims appear here. The draft remains local.</p>
          {approved.length > 0 && <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-canvas p-3 text-xs">{JSON.stringify({ ...draft.package, items: approved }, null, 2)}</pre>}
        </section>
      </>}
    </div>
  );
}
