import { afterEach, describe, expect, it } from "vitest";
import { createApi } from "@portavate/api";
import { createVerifier } from "@portavate/verifier";
import { applicationStatusSchema, healthSchema } from "@portavate/shared";

const openApps: ReturnType<typeof createApi>[] = [];
afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe("API", () => {
  it("responds to a health request", async () => {
    const app = createApi({});
    openApps.push(app);
    const response = await app.inject("/health");
    expect(response.statusCode).toBe(200);
    expect(healthSchema.safeParse(response.json()).success).toBe(true);
  });

  it("reports readiness without promoting configuration to live status or leaking secrets", async () => {
    const app = createApi({ ZERO_G_API_KEY: "fixture-private-key", API_URL: "https://fixture.internal" });
    openApps.push(app);
    const response = await app.inject("/api/status");
    expect(response.statusCode).toBe(200);
    const status = applicationStatusSchema.parse(response.json());
    expect(status.readiness).toBe("foundation");
    expect(Object.values(status.integrations)).toEqual(Array(5).fill("not_implemented"));
    expect(response.body).not.toMatch(/fixture|private-key/i);
  });

  it("allows the development origin and defaults to no cross-origin access in production", async () => {
    const dev = createApi({ NODE_ENV: "development" });
    const production = createApi({ NODE_ENV: "production" });
    openApps.push(dev, production);
    const request = { url: "/api/status", headers: { origin: "http://localhost:3000" } };
    expect((await dev.inject(request)).headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect((await production.inject(request)).headers["access-control-allow-origin"]).toBeUndefined();
    expect((await dev.inject({ ...request, headers: { origin: "https://other.example" } })).headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("verifier", () => {
  it("reports health and explicitly rejects paid verification", async () => {
    const app = createVerifier();
    openApps.push(app);
    const health = await app.inject("/health");
    expect(health.statusCode).toBe(200);
    expect(healthSchema.safeParse(health.json()).success).toBe(true);
    const response = await app.inject({ method: "POST", url: "/api/verify", payload: { verified: true } });
    expect(response.statusCode).toBe(501);
    expect(response.json()).toMatchObject({ error: "not_implemented" });
    expect(response.headers["payment-required"]).toBeUndefined();
  });
});
