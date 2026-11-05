import { z } from "zod";
import { identifier, IntegrationUnavailableError } from "@portavate/shared";
import type { MemoryPackage, MemoryVersion } from "@portavate/memory-core";

export const zeroGEvidenceSchema = z.strictObject({
  preparationRequestIds: z.array(identifier).min(1),
  evaluationRequestIds: z.array(identifier).min(1),
  model: identifier,
  route: z.enum(["verified", "private"]),
});
export type ZeroGEvidence = z.infer<typeof zeroGEvidenceSchema>;
export interface ZeroGAdapter {
  prepare(source: string, destination: MemoryPackage["sourceType"]): Promise<MemoryPackage>;
  evaluate(input: { scope: MemoryVersion; responses: readonly string[] }): Promise<ZeroGEvidence>;
}
export const unavailableZeroG: ZeroGAdapter = {
  async prepare() { throw new IntegrationUnavailableError("0G Private Computer"); },
  async evaluate() { throw new IntegrationUnavailableError("0G Private Computer"); },
};
