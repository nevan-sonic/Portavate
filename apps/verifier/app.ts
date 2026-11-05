import Fastify from "fastify";

import metadata from "./package.json" with { type: "json" };

export function createVerifier() {
  const app = Fastify();
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
  app.post("/api/verify", async (_request, reply) =>
    reply.code(501).send({ error: "not_implemented", message: "Paid verification is pending." }));
  return app;
}
