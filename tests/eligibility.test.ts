import { describe, expect, it } from "vitest";
import { createPassportEligibilityGuard } from "@portavate/verification";
import { expiry, now, record, run } from "./fixtures.ts";

describe("passport eligibility (synthetic server validation records)", () => {
  it("accepts the evaluated attempt when the trusted reader supplies every condition", () => {
    expect(createPassportEligibilityGuard(() => record)(run, now)).toEqual({ eligible: true });
  });

  it.each([
    ["missing_zero_g", { zeroG: undefined }],
    ["missing_arkiv", { arkiv: undefined }],
    ["missing_hedera", { hedera: undefined }],
    ["unsettled_payment", { hedera: { state: "pending" as const } }],
    ["missing_recipient_responses", { responses: [] }],
    ["policy_failed", { policy: { id: run.policyId, outcome: "failed" as const, evaluatedRun: run } }],
  ])("rejects %s even when the request includes evidence fields", (reason, change) => {
    expect(createPassportEligibilityGuard(() => ({ ...record, ...change }))(run, now)).toEqual({ eligible: false, reason });
  });

  it("rejects an expired manifest at the expiry boundary", () => {
    expect(createPassportEligibilityGuard(() => record)(run, Date.parse(expiry)))
      .toEqual({ eligible: false, reason: "invalid_memory_version" });
  });

  it("rejects a mismatched version or handoff", () => {
    const guard = createPassportEligibilityGuard(() => record);
    expect(guard({ ...run, memory: { ...run.memory, version: 2 } }, now)).toMatchObject({ reason: "scope_mismatch" });
    expect(guard({ ...run, handoffId: "different-handoff" }, now)).toMatchObject({ reason: "scope_mismatch" });
  });

  it("rejects altered responses and results for an evaluated run", () => {
    const guard = createPassportEligibilityGuard(() => record);
    expect(guard({ ...run, responses: [] }, now)).toMatchObject({ reason: "missing_recipient_responses" });
    expect(guard({ ...run, results: [{ ...run.results[0], passed: false }] }, now))
      .toMatchObject({ reason: "evaluation_mismatch" });
    expect(guard({ ...run, responses: [{ ...run.responses[0], content: "Modified response" }] }, now))
      .toMatchObject({ reason: "evaluation_mismatch" });
  });

  it("rejects untrusted evidence and client-provided success flags", () => {
    const guard = createPassportEligibilityGuard(() => undefined);
    expect(guard(run, now)).toEqual({ eligible: false, reason: "untrusted_run" });
    expect(guard({ ...run, settled: true, verified: true }, now)).toEqual({ eligible: false, reason: "invalid_run" });
  });
});
