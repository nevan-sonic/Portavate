import { z } from "zod";
import { identifier, IntegrationUnavailableError, timestamp } from "@portavate/shared";
import type { MemoryVersion } from "@portavate/memory-core";
import { commitmentSchema } from "@portavate/crypto";

export const responseEvidenceSchema = z.strictObject({
  responseId: identifier,
  testCaseId: identifier,
  commitment: commitmentSchema,
  observedAt: timestamp,
});
export const receivingResponseSchema = responseEvidenceSchema.extend({ content: identifier });
export type ReceivingResponse = z.infer<typeof receivingResponseSchema>;
export interface ReceivingAgent {
  respond(input: { memory: MemoryVersion; context: string; testCaseId: string; prompt: string }): Promise<ReceivingResponse>;
}
export const unavailableReceivingAgent: ReceivingAgent = {
  async respond() { throw new IntegrationUnavailableError("Receiving agent"); },
};
