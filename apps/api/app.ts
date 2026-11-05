import Fastify from "fastify";
import { registerMemoryRoutes } from "./memory-routes.ts";
import type { ExtractWithZeroG } from "@portavate/zero-g/client";
import cors from "@fastify/cors";
import type { ApplicationStatus } from "@portavate/shared";
import { readServerConfig } from "@portavate/shared/config";

import metadata from "./package.json" with { type: "json" };

export function createApi(env: NodeJS.ProcessEnv = process.env, extract?: ExtractWithZeroG) {
  const app = Fastify();
  const config = readServerConfig(env);
  if (config.WEB_ORIGIN) app.register(cors, { origin: [config.WEB_ORIGIN], methods: ["GET"] });
  app.setErrorHandler((error, _request, reply) => {
    const status = error instanceof Error && "statusCode" in error && typeof error.statusCode === "number"
      && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    return reply.code(status).send({ error: status === 500 ? "internal_error" : "invalid_request" });
  });
  app.get("/health", async () => ({
    status: "ok",
    version: metadata.version,
    timestamp: new Date().toISOString(),
  }));
  const zeroGStatus = registerMemoryRoutes(app, env, ["127.0.0.1", "::1"].includes(config.PORTAVATE_HOST), extract);
  app.get("/api/status", async (): Promise<ApplicationStatus> => ({
    readiness: "foundation",
    integrations: {
      zeroG: zeroGStatus(),
      arkiv: "not_implemented",
      hederaX402: "not_implemented",
      receivingAgent: "not_implemented",
      verification: "not_implemented",
    },
  }));
  return app;
}
