import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { memoryPackageSchema } from "@portavate/memory-core";
import {
  importBodyLimit, importSchema, reviewSchema, segmentSource, sourceByteLimit,
} from "@portavate/memory-core/import";
import type { ApplicationStatus } from "@portavate/shared";
import { createZeroGClient, readZeroGConfig, ZeroGError } from "@portavate/zero-g/client";
import type { ExtractWithZeroG } from "@portavate/zero-g/client";
import { openMemoryStore } from "./memory-store.ts";
import type { Draft, MemoryStore, Source } from "./memory-store.ts";

const ids = z.object({ id: z.uuid(), itemId: z.uuid().optional(), segmentId: z.string().regex(/^s[1-9][0-9]*$/).optional() });
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

export function registerMemoryRoutes(
  app: FastifyInstance,
  env: NodeJS.ProcessEnv,
  local: boolean,
  extractOverride?: ExtractWithZeroG,
): () => ApplicationStatus["integrations"]["zeroG"] {
  const config = readZeroGConfig(env);
  const extract = extractOverride ?? createZeroGClient(config);
  const token = env.PORTAVATE_ALPHA_TOKEN?.trim();
  if (token && !/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new Error("Invalid PORTAVATE_ALPHA_TOKEN");
  const expected = token ? Buffer.from(sha256("Bearer " + token), "hex") : undefined;
  let state: ApplicationStatus["integrations"]["zeroG"] = config.ZERO_G_API_KEY ? "configured_unverified" : "not_configured";
  const dbPath = env.PORTAVATE_MEMORY_DB?.trim() || "../../.portavate/memory.sqlite";
  if (dbPath === ":memory:" && env.NODE_ENV !== "test") throw new Error("Memory imports require a durable database.");
  let store: MemoryStore | undefined;
  const active = new Set<string>();
  app.addHook("onClose", async () => { store?.close(); });

  app.register(async (routes) => {
    routes.addHook("onRequest", async (request, reply) => {
      reply.header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff");
      if (!local || !expected) return reply.code(503).send({ error: "alpha_disabled", message: "Enable local import with PORTAVATE_ALPHA_TOKEN." });
      const authorization = request.headers.authorization ?? "";
      if (!timingSafeEqual(expected, Buffer.from(sha256(authorization), "hex"))) {
        return reply.code(401).send({ error: "unauthorized" });
      }
      store ??= openMemoryStore(dbPath);
    });
    const database = () => {
      if (!store) throw new Error("Memory database has not been opened.");
      return store;
    };

    routes.get("/sources", async () => ({ sources: database().list() }));

    routes.post("/sources", { bodyLimit: importBodyLimit }, async (request, reply) => {
      if (request.headers["content-type"]?.split(";")[0] !== "application/json") {
        return reply.code(415).send({ error: "json_required" });
      }
      const input = importSchema.safeParse(request.body);
      if (!input.success) return reply.code(400).send({ error: "invalid_source", message: "Provide a supported source and file name." });
      if (Buffer.byteLength(input.data.text, "utf8") > sourceByteLimit) {
        return reply.code(413).send({ error: "source_too_large", message: "Source must be 16 KiB or smaller." });
      }
      let segments;
      try { segments = segmentSource(input.data.format, input.data.text); }
      catch { return reply.code(400).send({ error: "invalid_source", message: "Source is empty or does not match the conversation format." }); }
      const source: Source = {
        ...input.data, id: randomUUID(), commitment: "sha256:" + sha256(input.data.text),
        segments, createdAt: new Date().toISOString(),
      };
      database().addSource(source);
      return reply.code(201).send({ id: source.id });
    });

    routes.post("/sources/:id/extractions", async (request, reply) => {
      const params = ids.safeParse(request.params);
      const source = params.success ? database().source(params.data.id) : undefined;
      if (!source) return reply.code(404).send({ error: "source_not_found" });
      const existing = database().draft(source.id);
      if (existing) return existing;
      if (active.size) return reply.code(409).send({ error: "extraction_in_progress", message: "Wait for the active extraction to finish, then retry." });
      active.add(source.id);
      try {
        const { extraction, metadata } = await extract(source.segments, source.sensitive);
        if (!extraction.items.length) {
          return reply.code(422).send({ error: "no_supported_claims", message: "0G found no supported claims in this source." });
        }
        const passages = new Map(source.segments.map((segment) => [segment.id, segment]));
        const quotes: Record<string, string> = {};
        const now = new Date().toISOString();
        const items = extraction.items.map((item) => {
          const passage = passages.get(item.segmentId);
          if (!passage || !passage.text.includes(item.quote)) throw new ZeroGError("invalid_output");
          const id = randomUUID();
          quotes[id] = item.quote;
          return {
            id, type: item.type, content: item.content,
            source: { documentId: source.id, locator: item.segmentId },
            importance: item.importance, confidence: item.confidence ?? 0,
            reviewStatus: "pending", sensitivity: source.sensitive ? "sensitive" : item.sensitivity,
            visibility: "owner_only", createdAt: now, updatedAt: now,
          };
        });
        const draft: Draft = {
          package: memoryPackageSchema.parse({
            schemaVersion: 1, packageId: source.id, ownerId: "local-owner",
            sourceType: source.sourceType, sourceCommitment: source.commitment,
            items, createdAt: now, updatedAt: now,
          }),
          inference: metadata, quotes, revision: 0,
        };
        const created = database().addDraft(draft);
        if (!extractOverride) state = "verified_live";
        return created ? reply.code(201).send(draft) : database().draft(source.id);
      } catch (error) {
        if (error instanceof ZeroGError) {
          state = error.code === "not_configured" ? "not_configured" : "unavailable";
          return reply.code(error.code === "not_configured" ? 503 : error.code === "provider_timeout" ? 504 : 502)
            .send({ error: error.code, message: error.message });
        }
        throw error;
      } finally {
        active.delete(source.id);
      }
    });

    routes.get("/drafts/:id", async (request, reply) => {
      const params = ids.safeParse(request.params);
      const draft = params.success ? database().draft(params.data.id) : undefined;
      return draft ?? reply.code(404).send({ error: "draft_not_found" });
    });

    routes.get("/sources/:id/evidence/:segmentId", async (request, reply) => {
      const params = ids.safeParse(request.params);
      const source = params.success ? database().source(params.data.id) : undefined;
      const segment = source?.segments.find(({ id }) => params.success && id === params.data.segmentId);
      return segment ?? reply.code(404).send({ error: "evidence_not_found" });
    });

    routes.patch("/drafts/:id/items/:itemId", { bodyLimit: 16_384 }, async (request, reply) => {
      const params = ids.safeParse(request.params);
      const input = reviewSchema.safeParse(request.body);
      if (!input.success) return reply.code(400).send({ error: "invalid_review", message: "Review requires nonempty claim text and a valid decision." });
      const draft = params.success ? database().draft(params.data.id) : undefined;
      const item = draft?.package.items.find(({ id }) => params.success && id === params.data.itemId);
      if (!draft || !item) return reply.code(404).send({ error: "item_not_found" });
      const { revision, ...decision } = input.data;
      if (revision !== draft.revision) return reply.code(409).send({ error: "stale_review", message: "This draft changed. Reopen it before saving." });
      const now = new Date().toISOString();
      Object.assign(item, decision, { updatedAt: now });
      draft.package.updatedAt = now;
      draft.revision++;
      if (!database().review(draft)) return reply.code(409).send({ error: "stale_review", message: "This draft changed. Reopen it before saving." });
      return draft;
    });
  }, { prefix: "/api/memory" });

  return () => state;
}
