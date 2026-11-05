import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApi } from "@portavate/api";
import { segmentSource, sourceByteLimit } from "@portavate/memory-core/import";
import type { ExtractWithZeroG } from "@portavate/zero-g/client";

const token = "test-alpha-token-" + "a".repeat(32);
const headers = { authorization: "Bearer " + token };
const env = { NODE_ENV: "test", PORTAVATE_ALPHA_TOKEN: token, PORTAVATE_MEMORY_DB: ":memory:" };
const sample = { name: "Test", format: "txt", text: "We decided to use SQLite.", sourceType: "chatbot", sensitive: true };
const route = "/api/memory";
const fixture: Awaited<ReturnType<ExtractWithZeroG>> = {
  extraction: { schemaVersion: 1, items: [{
    type: "decision", content: "Use SQLite", segmentId: "s1", quote: "use SQLite",
    importance: "critical", sensitivity: "normal",
  }] },
  metadata: { model: "test-model", requestId: "test-router-id", requestedTrustMode: "private", timestamp: "2026-01-01T00:00:00Z" },
};
async function importSource(app: ReturnType<typeof createApi>) {
  const result = await app.inject({ method: "POST", url: route + "/sources", headers, payload: sample });
  expect(result.statusCode).toBe(201);
  return String(result.json().id);
}

describe("local memory import", () => {
  it("normalizes JSON and preserves deterministic segment IDs and full source text", () => {
    const text = "🧪".repeat(2100);
    const segments = segmentSource("md", text);
    expect(segments.map((segment) => segment.id)).toEqual(["s1", "s2"]);
    expect(segments.map((segment) => segment.text).join("")).toBe(text);
    expect(segmentSource("json", '{"messages":[{"role":"assistant","content":"Keep this."}]}')[0])
      .toMatchObject({ id: "s1", text: "Keep this.", label: expect.stringContaining("assistant") });
  });

  it("rejects bad formats and byte limits and accepts Markdown and documented JSON", async () => {
    const app = createApi(env);
    try {
      for (const changes of [{ format: "pdf" }, { format: "json", text: "[]" }, { text: "   " }]) {
        const response = await app.inject({ method: "POST", url: route + "/sources", headers, payload: { ...sample, ...changes } });
        expect(response.statusCode).toBe(400);
      }
      const oversized = await app.inject({ method: "POST", url: route + "/sources", headers, payload: { ...sample, text: "é".repeat(sourceByteLimit) } });
      expect(oversized.statusCode).toBe(413);
      for (const changes of [{ format: "md", text: "# Decision" }, { format: "json", text: '{"messages":[{"role":"user","content":"Use SQLite"}]}' }]) {
        const response = await app.inject({ method: "POST", url: route + "/sources", headers, payload: { ...sample, ...changes } });
        expect(response.statusCode).toBe(201);
      }
    } finally { await app.close(); }
  });

  it("requires the local token for all private routes and disables public-host mode", async () => {
    const app = createApi(env);
    const publicHost = createApi({ ...env, PORTAVATE_HOST: "0.0.0.0" });
    try {
      expect((await app.inject(route + "/sources")).statusCode).toBe(401);
      expect((await app.inject({ url: route + "/sources", headers: { authorization: "Bearer wrong" } })).statusCode).toBe(401);
      expect((await publicHost.inject({ url: route + "/sources", headers })).statusCode).toBe(503);
    } finally { await app.close(); await publicHost.close(); }
  });

  it("keeps saved sources retryable when 0G is not configured", async () => {
    const app = createApi(env);
    try {
      const id = await importSource(app);
      const response = await app.inject({ method: "POST", url: `${route}/sources/${id}/extractions`, headers });
      expect(response.statusCode).toBe(503);
      expect(response.json().error).toBe("not_configured");
      expect((await app.inject({ url: route + "/sources", headers })).json().sources[0]).toMatchObject({ id, extracted: false });
    } finally { await app.close(); }
  });

  it.each([{ segmentId: "s999" }, { quote: "fabricated passage" }])("rejects ungrounded extraction %j", async (change) => {
    const app = createApi({ ...env, ZERO_G_API_KEY: "test-key" }, async () => ({
      ...fixture, extraction: { schemaVersion: 1, items: [{ ...fixture.extraction.items[0], ...change }] },
    }));
    try {
      const id = await importSource(app);
      const response = await app.inject({ method: "POST", url: `${route}/sources/${id}/extractions`, headers });
      expect(response.statusCode).toBe(502);
      expect(response.json().error).toBe("invalid_output");
      expect((await app.inject("/api/status")).json().integrations.zeroG).toBe("unavailable");
      expect((await app.inject({ url: `${route}/drafts/${id}`, headers })).statusCode).toBe(404);
    } finally { await app.close(); }
  });

  it("persists grounded drafts, edits, approvals and rejection across reopen", async () => {
    const dir = mkdtempSync(join(tmpdir(), "portavate-test-"));
    const testEnv = { ...env, PORTAVATE_MEMORY_DB: join(dir, "memory.sqlite"), ZERO_G_API_KEY: "test-key" };
    let app = createApi(testEnv, async (_segments, sensitive) => {
      expect(sensitive).toBe(true);
      return fixture;
    });
    try {
      const id = await importSource(app);
      const response = await app.inject({ method: "POST", url: `${route}/sources/${id}/extractions`, headers });
      expect(response.statusCode).toBe(201);
      const draft = response.json();
      const item = draft.package.items[0];
      expect(item).toMatchObject({ reviewStatus: "pending", visibility: "owner_only", sensitivity: "sensitive" });
      expect(draft.inference.requestId).toBe("test-router-id");
      expect((await app.inject("/api/status")).json().integrations.zeroG).toBe("configured_unverified");
      const evidence = await app.inject({ url: `${route}/sources/${id}/evidence/s1`, headers });
      expect(evidence.json().text).toBe(sample.text);
      const reviewUrl = `${route}/drafts/${id}/items/${item.id}`;
      for (const [revision, reviewStatus] of ["pending", "approved", "rejected"].entries()) {
        const update = await app.inject({ method: "PATCH", url: reviewUrl, headers, payload: {
          revision, content: "Use SQLite for the alpha", reviewStatus, visibility: "scoped", sensitivity: "sensitive",
        } });
        expect(update.statusCode).toBe(200);
        expect(update.json().package.items[0]).toMatchObject({ reviewStatus, visibility: "scoped" });
      }
      expect((await app.inject({ method: "PATCH", url: reviewUrl, headers, payload: {
        revision: 0, content: "Stale edit", reviewStatus: "approved", visibility: "scoped", sensitivity: "normal",
      } })).statusCode).toBe(409);

      await app.close();
      app = createApi(testEnv);
      const reopened = await app.inject({ url: `${route}/drafts/${id}`, headers });
      expect(reopened.json().package.items[0]).toMatchObject({ content: "Use SQLite for the alpha", reviewStatus: "rejected" });
      expect((await app.inject("/api/status")).json().integrations.zeroG).toBe("configured_unverified");
    } finally {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
