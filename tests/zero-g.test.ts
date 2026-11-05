import { describe, expect, it, vi } from "vitest";
import { createZeroGClient, readZeroGConfig } from "@portavate/zero-g/client";
import { extractionSchema, segmentSource } from "@portavate/memory-core/import";

const segments = segmentSource("txt", "We decided to use SQLite.");
const key = "test-only-provider-key";
const config = readZeroGConfig({ ZERO_G_API_KEY: key });
const output = { schemaVersion: 1, items: [{
  type: "decision", content: "Use SQLite", segmentId: "s1", quote: "use SQLite", importance: "normal", sensitivity: "normal",
}] };
const completion = {
  model: "glm-5.3", id: "test-completion-id",
  choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }],
  x_0g_trace: { request_id: "test-router-id", tee_verified: true, provider: "test-private-provider-address" },
  usage: { prompt_tokens: 9, completion_tokens: 4, total_tokens: 13 },
};

describe("0G transport (synthetic responses)", () => {
  it("uses documented JSON mode, captures Router metadata and strips irrelevant trace fields", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json(completion));
    const result = await createZeroGClient(config, transport)(segments, false);
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe("https://router-api.0g.ai/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer " + key);
    expect(new Headers(init?.headers).get("x-0g-provider-trust-mode")).toBe("verified");
    expect(JSON.parse(String(init?.body))).toMatchObject({ verify_tee: true, response_format: { type: "json_object" } });
    expect(result.extraction).toEqual(output);
    expect(result.metadata).toMatchObject({ requestId: "test-router-id", usage: { total_tokens: 13 } });
    expect(JSON.stringify(result.metadata)).not.toMatch(/private-provider|provider-key|completion-id/);
  });

  it("requires the private route for sensitive sources and fails closed without its reported verification", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ ...completion, x_0g_trace: { request_id: "test-id", tee_verified: false } }));
    await expect(createZeroGClient(config, transport)(segments, true)).rejects.toMatchObject({ code: "private_route_unconfirmed" });
    expect(new Headers(transport.mock.calls[0][1]?.headers).get("x-0g-provider-trust-mode")).toBe("private");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("fails safely on missing credentials or an unrecognized endpoint", async () => {
    const transport = vi.fn<typeof fetch>();
    await expect(createZeroGClient(readZeroGConfig({}), transport)(segments, false)).rejects.toMatchObject({ code: "not_configured" });
    expect(transport).not.toHaveBeenCalled();
    expect(() => readZeroGConfig({ ZERO_G_API_URL: "https://not-0g.example/v1" })).toThrow("ZERO_G_API_URL");
  });

  it.each([[401, "provider_auth"], [402, "provider_billing"], [503, "provider_unavailable"]])(
    "maps provider HTTP %i without exposing response bodies", async (status, code) => {
      const transport = vi.fn<typeof fetch>(async () => new Response("private diagnostics " + key, { status }));
      const result = createZeroGClient(config, transport)(segments, false);
      await expect(result).rejects.toMatchObject({ code });
      await expect(result).rejects.not.toThrow(/private diagnostics|test-only-provider-key/);
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );

  it("retries a bounded 429 and honors a Retry-After beyond its retry budget", async () => {
    const transport = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "0" } }))
      .mockResolvedValueOnce(Response.json(completion));
    await expect(createZeroGClient(config, transport)(segments, false)).resolves.toMatchObject({ extraction: output });
    expect(transport).toHaveBeenCalledTimes(2);
    const throttled = vi.fn<typeof fetch>(async () => new Response(null, { status: 429, headers: { "Retry-After": "15" } }));
    await expect(createZeroGClient(config, throttled)(segments, false)).rejects.toMatchObject({ code: "provider_rate_limit" });
    expect(throttled).toHaveBeenCalledTimes(1);
  });

  it("does not repeat a timeout with unknown billing outcome", async () => {
    const transport = vi.fn<typeof fetch>(async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Error("test timeout")));
    }));
    await expect(createZeroGClient(config, transport, 10)(segments, false)).rejects.toMatchObject({ code: "provider_timeout" });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing Router ID without substituting the completion ID", async () => {
    await expect(createZeroGClient(config, async () => Response.json({ ...completion, x_0g_trace: {} }))(segments, false))
      .rejects.toMatchObject({ code: "missing_request_id" });
  });

  it("rejects invalid provider JSON, unsupported versions, blank claims and invalid types", async () => {
    await expect(createZeroGClient(config, async () => Response.json({
      ...completion, choices: [{ finish_reason: "stop", message: { content: "not JSON" } }],
    }))(segments, false)).rejects.toMatchObject({ code: "invalid_output" });
    for (const invalid of [{ ...output, schemaVersion: 2 }, ...[{ type: "unknown" }, { content: " " }].map((change) =>
      ({ ...output, items: [{ ...output.items[0], ...change }] }))]) {
      expect(extractionSchema.safeParse(invalid).success).toBe(false);
    }
  });
});
