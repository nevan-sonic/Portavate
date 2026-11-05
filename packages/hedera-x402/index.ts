import { z } from "zod";
import { identifier, IntegrationUnavailableError, timestamp } from "@portavate/shared";
import type { MemoryVersion } from "@portavate/memory-core";

export const hederaEvidenceSchema = z.strictObject({
  transactionId: identifier,
  network: z.enum(["testnet", "mainnet"]),
  merchantId: identifier,
  asset: identifier,
  atomicAmount: z.string().regex(/^[1-9][0-9]*$/),
  settledAt: timestamp,
});
export type HederaEvidence = z.infer<typeof hederaEvidenceSchema>;
export interface HederaSettlement {
  confirm(input: { requestId: string; paymentPayload: string; memory: MemoryVersion }): Promise<HederaEvidence>;
}
export const unavailableHedera: HederaSettlement = {
  async confirm() { throw new IntegrationUnavailableError("Hedera x402"); },
};
