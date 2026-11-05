import { z } from "zod";

export const timestamp = z.iso.datetime();
export const identifier = z.string().trim().min(1);
export const contractVersion = z.literal(1);
export const versionNumber = z.number().int().positive();

export const integrationState = z.enum([
  "not_implemented", "not_configured", "configured_unverified", "verified_live", "unavailable",
]);

export const applicationStatusSchema = z.strictObject({
  readiness: z.enum(["foundation", "operational", "degraded"]),
  integrations: z.strictObject({
    zeroG: integrationState,
    arkiv: integrationState,
    hederaX402: integrationState,
    receivingAgent: integrationState,
    verification: integrationState,
  }),
});
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const healthSchema = z.strictObject({
  status: z.literal("ok"),
  version: z.string(),
  timestamp,
});

export class IntegrationUnavailableError extends Error {
  readonly code = "not_implemented";
  constructor(integration: string) {
    super(integration + " is not implemented.");
    this.name = "IntegrationUnavailableError";
  }
}
