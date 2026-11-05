# Portavate

**Your AI memory. Anywhere. Verified.**

Portavate is a design for transferring task-relevant memory between AI assistants and checking whether the receiving agent can use it. The planned **Continuity Passport** is a signed report that binds the outcome of specific checks to a memory version, a recipient, and a settled verification payment.

> **Project status · Step 1 foundation.** The local web workspace, status API, standalone verifier shell, shared contracts, and passport eligibility guard are available. Memory workflows, live integrations, passport issuance, benchmark execution, and public deployment are pending.

[Workflow](#verified-handoff) · [Architecture](#architecture) · [Getting started](#getting-started) · [ETHGlobal Mumbai](#ethglobal-mumbai-2026)

## Problem and first use case

A summary can reach its destination while the receiving agent still misses a requirement, applies a stale decision, or misunderstands a constraint. Copying a conversation also risks exposing unrelated material and losing the source of individual claims.

The first use case is a project handoff between independently operated coding agents. A startup can give a contractor's agent the approved architecture decisions and open tasks for one assignment. The recipient checks that it has the current version, buys a verification run within its spending policy, and gets a report showing which requirements it can apply and which need repair.

| Planned direction | Example | What continuity checks measure |
| --- | --- | --- |
| Coding agent → coding agent | Cursor → Codex | Architecture, implementation state, unresolved bugs, and test constraints |
| Chatbot → chatbot | ChatGPT → Gemini | Approved facts, preferences, source consistency, and contradictions |
| Chatbot → coding agent | ChatGPT → Cursor | Whether planning decisions become actionable implementation requirements |
| Coding agent → chatbot | Codex → ChatGPT | Whether a project briefing correctly describes decisions, evidence, and outstanding work |

P0 starts with user-supplied text, Markdown or a defined JSON import format and one real receiving-model adapter. The web UI handles imports and copy/paste. Later MCP or CLI tools can publish, discover, retrieve and verify project context. Browser capture would require user consent and supported site interfaces. The integration design uses data the user can access and export.

## Verified handoff

1. **Prepare.** Import authorized content. 0G Private Computer extracts typed claims and source references, tailors context for the destination, and proposes continuity checks.
2. **Review and publish.** The owner edits or rejects claims, approves the task scope, signs the version manifest, and publishes public version metadata to Arkiv. Store the encrypted artifact offchain.
3. **Discover and authorize.** Query Arkiv for the latest eligible version from the expected owner. Validate expiry, version lineage, signature, and commitment. Authenticate the recipient and enforce its signed grant before returning scoped context.
4. **Purchase verification.** The agent discovers an independently deployable verifier, receives an HTTP 402 quote and retries with a signed payment under a preset spending policy. The verifier confirms Hedera settlement and binds the receipt to the request before fulfilling it. [Hedera x402 flow](https://docs.hedera.com/solutions/ai/x402/how-it-works)
5. **Test and repair.** Run checks against the actual receiving agent. Prefer deterministic checks for objective requirements and use rubric-based semantic evaluation where needed. Use 0G to diagnose failed checks and propose targeted repairs from approved evidence. Require owner approval for critical changes, publish a new version when the artifact changes, and retest against the correct version and payment scope.
6. **Issue.** The verifier signs a Continuity Passport when all required evidence exists and the verification policy passes. Failed checks remain visible in the run history.

### Why these three integrations

| Dependency | Role in the trust model | When it fails |
| --- | --- | --- |
| **Hedera x402** | The buyer and independent verifier can reconcile a paid request against a shared settlement record. | The verifier withholds paid fulfillment until settlement is confirmed. |
| **Arkiv** | A client can query wallet-owned version metadata and independently check freshness without relying on Portavate's application database. | Retrieval or verification pauses if the current eligible version cannot be established. |
| **0G Private Computer** | Source-grounded extraction, destination context, evaluation and repair depend on actual inference with request evidence. | Preparation or evaluation stops. Sensitive jobs require a supported private route. |

Every completed handoff requires all three integrations, actual receiving-agent responses, and a valid issuer signature. A provider outage or missing evidence leaves the handoff incomplete. Read-only views can still show existing state. The registry and settlement layers let organizations verify shared records independently, while the artifact service remains responsible for private data and authorization.

## Architecture

This is the target architecture. The planned UI uses Next.js and TypeScript for import, review, wallet connection, version discovery, handoff progress, passports, benchmarks and spending controls. A Node.js/TypeScript API handles authentication, jobs, artifact access and sponsor orchestration. PostgreSQL stores operational state. Encrypted S3-compatible storage holds private artifacts and detailed reports.

~~~mermaid
flowchart LR
    Owner["Memory owner"] --> Web["Next.js web app"]
    Web --> API["Portavate API"]
    API --> DB["PostgreSQL job state"]
    API --> Store["Encrypted artifact storage"]
    API --> Registry["Arkiv version registry"]
    API --> Compute["0G Private Computer"]
    Agent["Receiving agent / adapter"] --> Registry
    Agent --> API
    Agent --> Verifier["Independent x402 verifier"]
    Verifier --> Registry
    Verifier --> API
    Verifier --> Compute
    Verifier --> Facilitator["Hedera facilitator"]
    Facilitator --> Hedera["Hedera settlement"]
~~~

### Handoff sequence

~~~mermaid
sequenceDiagram
    actor Owner
    participant API as Portavate API
    participant Compute as 0G Private Computer
    participant Registry as Arkiv
    participant Agent as Receiving agent
    participant Verifier as x402 verifier
    participant Pay as Hedera facilitator
    Owner->>API: Import approved source content
    API->>Compute: Extract claims and draft checks
    Compute-->>API: Structured output and request evidence
    API-->>Owner: Show claims and source references
    Owner->>API: Approve and sign manifest and recipient grant
    API->>Registry: Publish owner-authorized version metadata
    Agent->>Registry: Discover current eligible version
    Agent->>API: Authenticate and request scoped artifact
    API-->>Agent: Return authorized context and signed manifest
    Agent->>Verifier: Request checks for this handoff
    Verifier-->>Agent: HTTP 402 with payment terms
    Agent->>Verifier: Retry with policy-approved signed payment
    Verifier->>Pay: Verify and settle
    Pay-->>Verifier: Return settlement result
    Verifier->>Agent: Run continuity checks
    Agent-->>Verifier: Return actual responses
    Verifier->>Compute: Assess responses and identify gaps
    Compute-->>Verifier: Evaluation and request evidence
    Verifier->>Registry: Recheck version before issuance
    alt Evidence complete and policy passes
        Verifier-->>Agent: Issue signed Continuity Passport
    else Repair needed or evidence missing
        Verifier-->>Agent: Return findings or incomplete status
    end
~~~

### Handoff state

The proposed success path is `CREATED → SOURCE_IMPORTED → MEMORY_PREPARED → MEMORY_REVIEWED → VERSION_PUBLISHED → VERSION_VERIFIED → ACCESS_AUTHORIZED → PAYMENT_REQUIRED → PAYMENT_SETTLED → CONTINUITY_CHECKED → VERIFIED → PASSPORT_ISSUED`.

A failed check can move the job to `REPAIR_REQUIRED`. Retest with an explicit attempt ID and rerun freshness, authorization and payment-scope checks as applicable. Track `FAILED`, `CANCELLED` and `EXPIRED` outcomes. Reconcile uncertain settlement before retrying. Use a durable request ID and a unique settlement reference so concurrent retries cannot charge or fulfill the same purchase twice.

## Memory and passports

| Object | Proposed fields and behavior |
| --- | --- |
| **Universal Memory Package** | Schema version and owner; typed items for facts, decisions, preferences, requirements, constraints, completed and pending tasks, and known issues. Each item has a stable ID, content, source pointer and timestamp when available, importance, confidence or review status, visibility, sensitivity and validity. Destination renderings preserve evidence references. |
| **Signed version manifest** | Package ID, owner, version, parent, commitment, validity and signature. Canonical serialization and established primitives such as SHA-256, Ed25519 for service signatures, and authenticated encryption such as AES-GCM. Public metadata uses opaque identifiers and a commitment to encrypted bytes to limit disclosure. |
| **Memory Access Passport** | Signed authorization naming the owner, authenticated recipient, allowed version and fields, purpose, expiry and verification policy. The artifact service checks the grant, expiry and revocation on retrieval and enforces scope before releasing data. |
| **Continuity Passport** | Handoff and recipient IDs, source identity, version and commitment, evaluation scope, timestamps, tested requirements, results and source references, repair and retest history, 0G request evidence, Arkiv entity reference, Hedera transaction reference, issuer signature, expiry and final status. |

A signature authenticates the signer and signed bytes. The report records what a particular recipient did on specific checks at a particular time. Its conclusions are bounded by those checks and the evaluator's reliability.

## Benchmark Lab

Use three conditions on the same approved sources, tasks, recipient model and settings. Start each condition in an isolated session and record prompt versions and token budgets.

| Condition | Recipient context |
| --- | --- |
| Standard Port | Conventional context summary |
| Portavate Initial Transfer | Structured destination package before repair |
| Portavate After Repair | Approved targeted corrections followed by a fresh retest |

Freeze scored checks and pass thresholds before running the comparison. Keep a held-out set to measure transfer after repair without rewarding memorization of the repair prompts. Report critical-check pass rate, fact recall, constraint adherence, contradictions, evidence accuracy, elapsed time and cost. Record repeated runs and disclose semantic scoring limitations. Once implemented, reproduction requires a versioned fixture set, pinned model configuration, evaluator rubric, run instructions and raw per-check results. Benchmark results are pending.

## Security and privacy

- Keep private source material, keys and plaintext reports off public networks. Encrypt private artifacts and use managed secrets and scoped service identities. Public version metadata and payment records can still expose relationships or activity.
- Authenticate recipients and verify ownership, scope, signature, revocation, expiry and current version server-side. Revocation blocks future authorized retrieval. Recipients may retain copies already delivered.
- Treat imported content and receiving-agent output as untrusted data. Separate instructions from imported evidence, validate structured outputs and evidence references, and restrict evaluation tools and side effects.
- Require the supported 0G private route for sensitive jobs and stop on downgrade or missing route evidence. The API can see plaintext during import and preparation. The receiving model and its provider see the context delivered to them under their own trust boundary. Avoid logging sensitive inputs. [0G Private Computer](https://pc.0g.ai/)
- Restrict authorized spend by asset, network, merchant and budget. Validate each quote and bind a confirmed settlement to one specific request, recipient and artifact version.

## Getting started

Use Node.js 24 or 26 LTS and pnpm 11.25.0. Step 1 runs locally without credentials, PostgreSQL, or object storage.

~~~sh
git clone https://github.com/nevan-sonic/Portavate.git
cd Portavate
pnpm install --frozen-lockfile
pnpm dev
~~~

| Service | Local URL | Purpose |
| --- | --- | --- |
| Web | http://localhost:3000 | Dashboard with live API readiness and five workspace routes |
| API | http://127.0.0.1:4000 | GET /health and GET /api/status |
| Verifier | http://127.0.0.1:4001 | GET /health and a POST /api/verify placeholder returning HTTP 501 |

The dashboard fetches status on the server. Copy [the example configuration](.env.example) to a root .env file if you need to override defaults. API_URL is server-side. WEB_ORIGIN can explicitly allow a browser origin on the API. Production cross-origin access defaults to disabled. Leave future integration settings blank for Step 1.

~~~sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
~~~

The build compiles the Next.js app and type-checks the workspace. The two services use Node.js LTS native TypeScript execution and can each run independently from the workspace.

~~~sh
pnpm --filter @portavate/api start
pnpm --filter @portavate/verifier start
pnpm --filter @portavate/web start
~~~

Run those commands in separate terminals after building. See [build progress](docs/build-progress.md) for the implemented boundaries, verification results, and next milestone. The planned hosted deployment uses the Next.js frontend, separate Node.js services, managed PostgreSQL, and encrypted object storage.


## ETHGlobal Mumbai 2026

**Submission deadline · Saturday, November 7, 2026 at 9:00 AM IST.** Submit through the Hacker Dashboard and select the three partner prizes there. For Classic eligibility, start project work after the official kickoff and preserve incremental commits. Identify reused work and disclose AI assistance. If using a spec-driven workflow, retain its prompts, specifications and planning artifacts for submission. [Event rules and submission details](https://ethglobal.com/events/mumbai/info/details)

| Priority | Target track | Published first prize |
| --- | --- | --- |
| 1 | AI Agents That Pay: x402 on Hedera | $3,000 |
| 2 | Build on Arkiv (from scratch) | $3,000 |
| 3 | Build with 0G Private Computer | $2,500 |

Combined first-place opportunity is $8,500, subject to qualification and judging. Track names, amounts and deadline match the brief in substance. The official Arkiv title uses lowercase “from scratch.” Track-specific requirements below add detail to the general event guidance. [Official prizes](https://ethglobal.com/events/mumbai/prizes)

- **Hedera.** Run an x402 endpoint that settles on Hedera testnet or mainnet through a listed or self-operated facilitator. Show an agent discovering it and paying end to end without human approval. Provide a public repo with setup, architecture, payment flow and a settled transaction ID. Supply a video of at most five minutes showing settlement with a HashScan link. Portavate plans testnet settlement for paid continuity checks. [Official prize requirements](https://ethglobal.com/events/mumbai/prizes#hedera) · [Hedera facilitators](https://docs.hedera.com/solutions/ai/x402/facilitators)
- **Arkiv.** Build from scratch at Mumbai and write to the current testnet through the official SDK or JSON-RPC. Demonstrate a user-facing read through current-version discovery. Provide a public repo with an open-source license and AI disclosure. Include publishing wallet addresses and a runnable query in the README. Add `arkiv/schema.md` for entity fields, ownership and expiry and `arkiv/friction.md`, `arkiv/reach.md`, `arkiv/why-arkiv.md` and `arkiv/how-you-use-arkiv.md` with concrete feedback, expected adoption, the registry rationale and how each feature affects users. These files require real integration evidence and are pending. [Official prize requirements](https://ethglobal.com/events/mumbai/prizes#arkiv) · [Arkiv testnet and SDK docs](https://docs.arkiv.network/)
- **0G.** Show main-flow Private Computer inference with request IDs in a working app judges can try and a reason to return. Portavate uses it to prepare and evaluate new handoffs whenever project decisions change. Without 0G, the service cannot generate evidence-linked context or evaluate and repair continuity gaps. Submit the project name and description, public repo with setup, live demo, video under three minutes, any contract addresses, and team names and Telegram/X contacts. The optional iAI bonus requires demonstrating account sign-in and actual credit consumption. [Official prize requirements](https://ethglobal.com/events/mumbai/prizes#0g) · [0G Private Computer](https://pc.0g.ai/)

| Submission evidence | Status |
| --- | --- |
| Public live app and demo video | Pending implementation and deployment |
| Hedera settled transaction ID and HashScan reference | Pending paid verification run |
| Arkiv publisher wallets, entity IDs, runnable query and criterion files | Pending registry integration |
| 0G inference request IDs and route evidence | Pending actual inference |
| Benchmark outputs and signed Continuity Passport | Pending end-to-end handoff |
| Open-source license, team contacts and contract addresses if applicable | Pending maintainer and submission details |

## Roadmap

| Phase | Scope |
| --- | --- |
| **P0 · Hackathon release** | Web app, approved source import, 0G extraction and evaluation, signed encrypted memory, Arkiv write and live read, Hedera x402 payment, one actual recipient adapter, repair and retest, signed Continuity Passport, benchmark comparison, public deployment and reproducible sponsor evidence |
| **P1 · More interfaces** | MCP and CLI, more model providers and import formats, better project capture, consent-based browser integration and broader benchmark coverage |
| **P2 · Commercial expansion** | Multi-organization controls, independent verification marketplace, audit features, stronger key management and operational security, and mainnet where appropriate |

AI-assisted teams and contractors are the initial audience. Everyday cross-chatbot continuity and enterprise agent orchestration are later use cases. Pay-per-verification, team subscriptions and enterprise policy controls are business hypotheses.

## Related work and limitations

Portable Agent Memory describes signed, policy-aware transfer across heterogeneous agents and provides an SDK. Mem0/OpenMemory is another reference point for persistent agent memory. Portavate's design emphasis is measuring recipient behavior after transfer, repairing gaps from approved sources and tying the result to a version lookup and independently settled verification purchase. [Portable Agent Memory paper](https://arxiv.org/abs/2605.11032) · [Reference SDK](https://github.com/santhoshravindran7/portable-agent-memory) · [Mem0](https://github.com/mem0ai/mem0)

P0 covers a defined set of imports and one receiving adapter. Coverage depends on which source evidence the owner approves and which behaviors the checks exercise. Semantic scoring can vary, and provider availability can interrupt new handoffs.

## Contributing and attribution

Use GitHub issues to discuss schema decisions, trust boundaries, adapter scope or benchmark fixtures. Keep changes focused and use descriptive commits. Capture reproduction steps and evidence for integrations. Attribute any reused code and follow its license.

OpenAI Codex assisted with the initial `README.md` draft, source verification and editing from the maintainer's product brief. Codex also assisted with the sponsor and architecture documents and the Step 1 monorepo, application shell, contracts and tests. The specification cites research and sponsor documentation as references.
