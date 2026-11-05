import type { MemoryItem, VersionManifest } from "@portavate/memory-core";
import type { ReadValidatedRun, VerificationRun } from "@portavate/verification";

// Synthetic test data only. No external system produced these identifiers.
export const start = "2026-01-01T00:00:00Z";
export const expiry = "2026-01-02T00:00:00Z";
export const now = Date.parse("2026-01-01T12:00:00Z");
const commitment = "sha256:" + "a".repeat(64);
export const signature = { algorithm: "ed25519", keyId: "test-key", value: "dGVzdA" } as const;
export const memory = { packageId: "test-package", version: 1, artifactCommitment: commitment };

export const memoryItem: MemoryItem = {
  id: "test-item", type: "fact", content: "Fixture content",
  source: { documentId: "test-source", locator: "line 1" },
  importance: "normal", confidence: 0.8, reviewStatus: "approved", sensitivity: "normal",
  visibility: "scoped", createdAt: start, updatedAt: start,
};

export const manifest: VersionManifest = {
  ...memory, schemaVersion: 1, parentVersion: null, ownerId: "test-owner", expiresAt: expiry, signature,
};

const scope = { runId: "test-run", handoffId: "test-handoff", recipientId: "test-recipient", memory, attempt: 1 };
const response = { responseId: "test-response", testCaseId: "test-check", commitment, observedAt: start };
const zeroG = {
  preparationRequestIds: ["test-prep"], evaluationRequestIds: ["test-eval"], model: "test-model", route: "private",
} as const;
const arkiv = { entityId: "test-entity", chainId: 1, publisherId: "test-owner", observedAt: start };
const hedera = {
  transactionId: "test-transaction", network: "testnet", merchantId: "test-merchant", asset: "test-asset",
  atomicAmount: "1", settledAt: start,
} as const;

export const run: VerificationRun = {
  ...scope, schemaVersion: 1, recipientModel: "test-model", policyId: "test-policy",
  responses: [{ ...response, content: "Synthetic response" }],
  testCases: [{ id: "test-check", prompt: "Fixture prompt", critical: true }],
  results: [{ testCaseId: "test-check", passed: true }],
  sponsorEvidence: { zeroG: { ...zeroG, preparationRequestIds: [...zeroG.preparationRequestIds], evaluationRequestIds: [...zeroG.evaluationRequestIds] }, arkiv, hedera },
  status: "evaluated", createdAt: start, updatedAt: start,
};

export const record: NonNullable<ReturnType<ReadValidatedRun>> = {
  scope,
  zeroG: run.sponsorEvidence.zeroG,
  arkiv: { evidence: arkiv, currentManifest: manifest },
  hedera: { state: "confirmed", evidence: hedera },
  responses: [response],
  policy: { id: run.policyId, outcome: "passed", evaluatedRun: structuredClone(run) },
};
