import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { arkivEvidenceSchema } from "@portavate/arkiv";
import { signatureSchema } from "@portavate/crypto";
import { hederaEvidenceSchema } from "@portavate/hedera-x402";
import { memoryVersionSchema, versionManifestSchema } from "@portavate/memory-core";
import type { VersionManifest } from "@portavate/memory-core";
import { receivingResponseSchema, responseEvidenceSchema } from "@portavate/receiving-agent";
import { contractVersion, identifier, timestamp } from "@portavate/shared";
import { zeroGEvidenceSchema } from "@portavate/zero-g";

const scopeSchema = z.strictObject({
  runId: identifier,
  handoffId: identifier,
  recipientId: identifier,
  memory: memoryVersionSchema,
  attempt: z.number().int().positive(),
});

const resultSchema = z.strictObject({
  testCaseId: identifier,
  passed: z.boolean(),
});

export const verificationRunSchema = scopeSchema.extend({
  schemaVersion: contractVersion,
  recipientModel: identifier,
  policyId: identifier,
  responses: z.array(receivingResponseSchema),
  testCases: z.array(z.strictObject({ id: identifier, prompt: identifier, critical: z.boolean() })),
  results: z.array(resultSchema),
  sponsorEvidence: z.strictObject({
    zeroG: zeroGEvidenceSchema.optional(),
    arkiv: arkivEvidenceSchema.optional(),
    hedera: hederaEvidenceSchema.optional(),
  }),
  status: z.enum(["pending", "evaluated", "repair_required", "failed", "cancelled", "expired"]),
  createdAt: timestamp,
  updatedAt: timestamp,
}).refine((run) => Date.parse(run.updatedAt) >= Date.parse(run.createdAt), { path: ["updatedAt"] });

export const continuityPassportSchema = scopeSchema.extend({
  schemaVersion: contractVersion,
  passportId: identifier,
  issuerId: identifier,
  policyId: identifier,
  results: z.array(resultSchema).min(1),
  zeroG: zeroGEvidenceSchema,
  arkiv: arkivEvidenceSchema,
  hedera: hederaEvidenceSchema,
  responses: z.array(responseEvidenceSchema).min(1),
  issuedAt: timestamp,
  expiresAt: timestamp,
  signature: signatureSchema,
}).refine((passport) => Date.parse(passport.expiresAt) > Date.parse(passport.issuedAt), { path: ["expiresAt"] });

type Scope = z.infer<typeof scopeSchema>;
export type VerificationRun = z.infer<typeof verificationRunSchema>;
export type ContinuityPassport = z.infer<typeof continuityPassportSchema>;

type ValidationRecord = {
  scope: Scope;
  zeroG?: z.infer<typeof zeroGEvidenceSchema>;
  arkiv?: { evidence: z.infer<typeof arkivEvidenceSchema>; currentManifest: VersionManifest };
  hedera?: { state: "pending" | "confirmed" | "failed"; evidence?: z.infer<typeof hederaEvidenceSchema> };
  responses?: readonly z.infer<typeof responseEvidenceSchema>[];
  policy?: { id: string; outcome: "passed" | "failed"; evaluatedRun: VerificationRun };
};

// Inject only a server-owned, validated snapshot reader at the verifier composition root.
// Request handlers must never construct this reader from a payload. Step 1 provides no live reader.
export type ReadValidatedRun = (runId: string) => Readonly<ValidationRecord> | undefined;

function sameMemory(left: Scope["memory"], right: Scope["memory"]) {
  return left.packageId === right.packageId && left.version === right.version
    && left.artifactCommitment === right.artifactCommitment;
}

export function createPassportEligibilityGuard(readValidatedRun: ReadValidatedRun) {
  return (input: unknown, now: number) => {
    const parsed = verificationRunSchema.safeParse(input);
    if (!parsed.success || !Number.isFinite(now)) return { eligible: false, reason: "invalid_run" } as const;
    const run = parsed.data;
    const record = readValidatedRun(run.runId);
    if (!record) return { eligible: false, reason: "untrusted_run" } as const;

    const scope = record.scope;
    if (run.runId !== scope.runId || run.handoffId !== scope.handoffId || run.recipientId !== scope.recipientId
      || run.attempt !== scope.attempt || !sameMemory(run.memory, scope.memory)) {
      return { eligible: false, reason: "scope_mismatch" } as const;
    }
    if (!zeroGEvidenceSchema.safeParse(record.zeroG).success) return { eligible: false, reason: "missing_zero_g" } as const;
    if (!record.arkiv || !arkivEvidenceSchema.safeParse(record.arkiv.evidence).success) {
      return { eligible: false, reason: "missing_arkiv" } as const;
    }
    const manifest = versionManifestSchema.safeParse(record.arkiv.currentManifest);
    if (!manifest.success || !sameMemory(manifest.data, run.memory) || Date.parse(manifest.data.expiresAt) <= now) {
      return { eligible: false, reason: "invalid_memory_version" } as const;
    }
    if (!record.hedera) return { eligible: false, reason: "missing_hedera" } as const;
    if (record.hedera.state !== "confirmed" || !hederaEvidenceSchema.safeParse(record.hedera.evidence).success) {
      return { eligible: false, reason: "unsettled_payment" } as const;
    }

    const responseMatches = run.responses.length > 0 && run.responses.length === record.responses?.length
      && new Set(run.responses.map(({ responseId }) => responseId)).size === run.responses.length
      && run.responses.every((response) => record.responses?.some((observed) =>
        observed.responseId === response.responseId && observed.testCaseId === response.testCaseId
        && observed.commitment === response.commitment && observed.observedAt === response.observedAt));
    if (!responseMatches) return { eligible: false, reason: "missing_recipient_responses" } as const;
    if (run.status !== "evaluated" || record.policy?.id !== run.policyId || record.policy.outcome !== "passed") {
      return { eligible: false, reason: "policy_failed" } as const;
    }
    if (!isDeepStrictEqual(run, record.policy.evaluatedRun)) {
      return { eligible: false, reason: "evaluation_mismatch" } as const;
    }
    return { eligible: true } as const;
  };
}
