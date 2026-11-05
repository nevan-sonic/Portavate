import { z } from "zod";
import { identifier, IntegrationUnavailableError, timestamp } from "@portavate/shared";
import type { VersionManifest } from "@portavate/memory-core";

export const arkivEvidenceSchema = z.strictObject({
  entityId: identifier,
  chainId: z.number().int().positive(),
  publisherId: identifier,
  observedAt: timestamp,
});
export type ArkivEvidence = z.infer<typeof arkivEvidenceSchema>;
export interface ArkivRegistry {
  publish(manifest: VersionManifest): Promise<ArkivEvidence>;
  discoverCurrent(packageId: string, ownerId: string): Promise<{ manifest: VersionManifest; evidence: ArkivEvidence }>;
}
export const unavailableArkiv: ArkivRegistry = {
  async publish() { throw new IntegrationUnavailableError("Arkiv"); },
  async discoverCurrent() { throw new IntegrationUnavailableError("Arkiv"); },
};
