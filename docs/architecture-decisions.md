# Architecture decisions

**Status · Design baseline.** This document defines Portavate's implementation constraints. The [README](../README.md) describes product scope. [Sponsor requirements](sponsor-requirements.md) tracks qualification and submission evidence.

## 1. Require all three integrations to complete a handoff

Portavate transfers approved task context between coding agents and chatbots in all four logical directions. Continuity means that a specific recipient demonstrates it can use the scoped knowledge. Completion requires successful 0G preparation and evaluation, current and valid Arkiv registry state, confirmed Hedera x402 settlement for the verification run, actual recipient responses, a passing evaluation policy, and a signed report. Each is a separate condition. Failure of any single condition blocks completion. Existing records can remain viewable with their original status and timestamps.

## 2. Put public version discovery on Arkiv and private artifacts offchain

Arkiv allows independent clients to discover wallet-owned versions without relying on Portavate's application database. PostgreSQL may track jobs and attempts. It cannot substitute for the current-version query. Publish opaque package identifiers, owner, version, parent, commitment and expiry. Validate the expected owner and signature, check lineage and expiry, and resolve the current eligible version deterministically. Block on stale data, conflicting heads, or an unavailable read. Recheck before issuance so a paid evaluation cannot silently carry over to a newer version.

Store source material, encrypted memory packages, detailed reports and keys offchain with separate access controls. A public commitment to encrypted bytes can validate the artifact without publishing its contents. Bind the commitment and version in a signed manifest using canonical encoding. Public metadata can still expose activity or associations, so minimize it. Keep storage keys and locators that grant access out of registry records.

## 3. Enforce recipient authorization at retrieval

Use a signed Memory Access Passport to bind the owner, authenticated recipient, artifact version, permitted fields, purpose, expiry and verification policy. The service enforces the grant, scope and revocation on each retrieval. Scope the verifier's access to evidence needed for the run. Revocation prevents future authorized retrieval. Already delivered copies remain under the recipient's control. The API can see plaintext during import and preparation, and a recipient provider can see context shared with it. Document both boundaries even when the 0G path supports private inference.

## 4. Make real 0G inference part of the critical path

0G prepares the source-grounded memory and checks, adapts context to the destination, evaluates actual recipient responses and suggests evidence-based repairs. Owner approval distinguishes extracted claims from accepted memory. Imported content and model output are untrusted. Validate typed output and source pointers, keep evidence separate from instructions, and limit model tools and side effects. Prefer deterministic assertions for objective checks. Record actual 0G request IDs and validate the required route evidence for each stage. Fail sensitive jobs on a missing or downgraded private route.

## 5. Charge for independent verification

Deploy the verifier as a service with its own identity and signing key. Its product is a continuity assessment against a defined scope. The recipient agent discovers the verifier and autonomously accepts a valid HTTP 402 quote under owner-approved network, merchant, asset and spending policy. Require actual settlement before paid fulfillment, including for testnet demonstrations. Testnet evidence establishes that the integration ran and can be independently inspected.

Bind settlement to a durable verification request ID, recipient, artifact version and commitment, evaluation scope and quoted terms. Persist the attempt before payment, enforce unique settlement consumption, and return the existing run on a valid replay of the same request. Reconcile unknown settlement before initiating another transfer. Distinguish retrying fulfillment after payment from purchasing a new scope. Never let a transaction for one recipient or artifact unlock another.

## 6. Verify evidence and issue a bounded report

The verifier establishes provenance, freshness, authorization, settlement and evaluation by checking their underlying records. Workflow flags can schedule work. Issuance depends on validated evidence and an authorized issuer signature. Bind the report to a handoff ID, recipient, version and artifact commitment, checks and policy version, timestamps and expiry, actual results and evidence pointers, repair history and all three integration references. Sign the canonical report and persist the report and completion transition together, or use a recoverable issuance protocol with a stable report ID.

A Continuity Passport records results for tested behavior within its stated scope and time. A signature authenticates the report and issuer. Confidence scores and semantic judgments have bounded reliability. If checks fail, retain the original results, propose source-grounded repairs, require owner approval for critical changes and retest. A changed artifact needs a newly signed version and a fresh registry check. Revalidate access and payment scope on every retest and obtain a new payment if the purchase does not cover it.

## 7. Persist the workflow and fail safely

| Stage | Transition requires |
| --- | --- |
| Import and prepare | Authorized source, real 0G extraction and evidence-linked output |
| Review and publish | Owner approval, encrypted artifact, signed manifest and observed Arkiv publication |
| Discover and retrieve | Recipient queries the current eligible Arkiv version and validates it, then the artifact service authorizes scoped retrieval |
| Load context and request verification | Receiving model processes the scoped package, and the agent discovers an independent verifier and receives a 402 challenge |
| Authorize and settle payment | Agent accepts the quote under its policy, signs and retries. The verifier confirms genuine settlement and persists the request binding |
| Test and evaluate | The verifier probes actual recipient behavior and 0G evaluates responses against the frozen policy |
| Repair or verify | Failed checks trigger targeted repair and a new attempt. Passing checks advance only with all sponsor evidence |
| Issue passport | Verify freshness again and persist the signed report for the successful attempt |

Use explicit incomplete, repair-required, failed, cancelled and expired states. Preserve payment evidence when later steps fail. Recheck authorization, expiry and the version before resuming. Guard transitions against duplicate events, concurrent retries and partially persisted state. Automated tests may use clearly labeled mocks for failure and protocol edge cases. Production, public demos and sponsor evidence must use genuine services. A mock-backed run cannot produce a completed production passport.

## 8. Deliver one vertical slice first

Start with one approved import format, one actual receiving-model adapter, one verifier deployment and one testnet workflow. Exercise payment, version changes, authorization, repair and retest against that same slice. Broad adapters and optional sponsor features can follow once a repeatable live run proves the shared contracts. For the benchmark, compare a standard summary, the initial structured package and a repaired package under the same fixed policy and model configuration.

## Open decisions and validation

| Area | Resolve before committing to an implementation |
| --- | --- |
| Hedera x402 | Select a compatible facilitator, network and asset. Verify challenge and retry payloads, buyer signing and account setup, settlement status and transaction reference, and replay and uncertain-settlement recovery behavior. |
| Arkiv | Verify SDK or RPC version, wallet ownership and delegated write mechanics, query ordering and expiry behavior, index lag and how to validate freshness. Decide how forks or simultaneous publishes are resolved. |
| 0G | Verify model availability, private routing and failure semantics, request ID and receipt fields, attestation validation where supported, credit provisioning and quotas. |
| Artifact and identity | Choose canonical format, signature schemes and key rotation, encryption and storage policy, source reference format, owner-to-wallet binding and recipient authentication. |
| Verification policy | Freeze the rubric and critical-check threshold, define how recipient sessions are bound to the artifact, and specify what a purchase covers on repair, retries and terminal failure. |
| Operations | Choose deployment, secret storage, retention and audit policy. Verify which diagnostics are safe to expose in demo and production. |

Resolve open items through official documentation and, during implementation, a minimal live test. Record concrete evidence and update the decisions when a validated constraint changes the design.
