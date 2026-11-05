import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ImportInput, SourceSegment } from "@portavate/memory-core/import";
import type { MemoryPackage } from "@portavate/memory-core";
import type { InferenceMetadata } from "@portavate/zero-g/client";

export type Source = ImportInput & {
  id: string;
  commitment: string;
  segments: SourceSegment[];
  createdAt: string;
};
export type Draft = {
  package: MemoryPackage;
  inference: InferenceMetadata;
  quotes: Record<string, string>;
  revision: number;
};

export function openMemoryStore(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  try {
    db.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    db.exec("BEGIN IMMEDIATE");
    const version = Number(db.prepare("PRAGMA user_version").get()?.user_version);
    if (version > 1) throw new Error("Unsupported memory database schema.");
    if (version === 0) db.exec(`
      CREATE TABLE sources (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, data TEXT NOT NULL) STRICT;
      CREATE TABLE drafts (
        id TEXT PRIMARY KEY REFERENCES sources(id), revision INTEGER NOT NULL, data TEXT NOT NULL
      ) STRICT;
      PRAGMA user_version = 1;
    `);
    db.exec("COMMIT");
  } catch (error) {
    db.close();
    throw error;
  }
  const getSource = db.prepare("SELECT data FROM sources WHERE id = ?");
  const getDraft = db.prepare("SELECT data FROM drafts WHERE id = ?");
  const insertSource = db.prepare("INSERT INTO sources (id, created_at, data) VALUES (?, ?, ?)");
  const insertDraft = db.prepare("INSERT INTO drafts (id, revision, data) VALUES (?, 0, ?) ON CONFLICT(id) DO NOTHING");
  const updateDraft = db.prepare("UPDATE drafts SET revision = ?, data = ? WHERE id = ? AND revision = ?");
  const list = db.prepare(`
    SELECT sources.id, sources.created_at, json_extract(sources.data, '$.name') AS name,
      drafts.id IS NOT NULL AS extracted
    FROM sources LEFT JOIN drafts ON sources.id = drafts.id ORDER BY sources.created_at DESC, sources.id DESC LIMIT 100
  `);
  return {
    addSource(source: Source) { insertSource.run(source.id, source.createdAt, JSON.stringify(source)); },
    source(id: string): Source | undefined {
      const row = getSource.get(id);
      return row && JSON.parse(String(row.data));
    },
    draft(id: string): Draft | undefined {
      const row = getDraft.get(id);
      return row && JSON.parse(String(row.data));
    },
    addDraft(draft: Draft) { return insertDraft.run(draft.package.packageId, JSON.stringify(draft)).changes === 1; },
    review(draft: Draft) {
      return updateDraft.run(draft.revision, JSON.stringify(draft), draft.package.packageId, draft.revision - 1).changes === 1;
    },
    list() {
      return list.all().map((row) => ({
        id: String(row.id), name: String(row.name), createdAt: String(row.created_at), extracted: Boolean(row.extracted),
      }));
    },
    close() { db.close(); },
  };
}
export type MemoryStore = ReturnType<typeof openMemoryStore>;
