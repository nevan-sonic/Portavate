# Build progress

## Step 1 · Application foundation

The workspace runs locally on Node.js LTS and pnpm. The Next.js dashboard reads and validates live readiness data from the Fastify API. The other five routes explain their planned capabilities and show empty states. The independent verifier has a health endpoint and returns HTTP 501 for paid verification requests.

| Location | Responsibility |
| --- | --- |
| `apps/web` | App Router workspace, responsive navigation, status loading and outage handling |
| `apps/api` | Health and integration readiness, with explicit CORS policy |
| `apps/verifier` | Separately runnable verifier shell |
| `packages/shared` | Health, readiness and server configuration validation |
| `packages/memory-core`, `packages/crypto` | Versioned memory, access and manifest contracts, plus commitment and signature formats |
| `packages/verification` | Verification run and passport schemas, and eligibility guard backed by a trusted server reader |
| `packages/zero-g`, `packages/arkiv`, `packages/hedera-x402`, `packages/receiving-agent` | Typed integration boundaries and adapters that reject unavailable operations |
| `packages/benchmark` | Labels for the three benchmark conditions |
| `tests` | Deterministic contract, eligibility and HTTP service tests |

### Validation

- `pnpm install --frozen-lockfile` installs the locked workspace dependencies.
- `pnpm typecheck` generates Next.js route types and checks the strict TypeScript workspace.
- `pnpm lint` checks application, package and test sources.
- `pnpm test` passed 20 tests covering invalid schemas, incomplete and altered evidence, client-supplied flags, status and CORS behavior, and the unavailable verifier.
- `pnpm build` passed, including the optimized Next.js build. Fastify services execute checked TypeScript with Node.js LTS.
- `pnpm dev` started all three services together and served both health endpoints and the API-backed dashboard.
- A production HTTP smoke test started both services and the web app on ports 4000, 4001 and 3000. Both health endpoints and all six web routes returned HTTP 200. The dashboard rendered the API's five integration states and handled API shutdown. The verifier returned HTTP 501 without a payment challenge.

### Limits and next milestone

All sponsor and recipient adapters report `not_implemented`. There is no production validation reader or passport issuer. Format validation of signatures and commitments does not authenticate them. PostgreSQL, encrypted storage, authentication, memory import, benchmark execution and deployment are pending.

The next milestone is the first approved import and receiving-model vertical slice. Use [the architecture decisions](architecture-decisions.md) for the trust boundaries and [sponsor requirements](sponsor-requirements.md) for live evidence and qualification.

## Step 2 · Local 0G memory import

Import Memory accepts pasted text and UTF-8 text, Markdown, or conversation JSON. It saves the source, submits numbered passages to the 0G Router, validates versioned JSON, and checks quoted evidence before saving an owner-only draft. Review supports filtering, inspecting passages, editing, approval, rejection, sensitivity, visibility, and an approved-package preview.

The local API uses a bearer token and SQLite migration 1. Sources and review decisions survive process restart. The database is plaintext and intended for a single trusted machine. See [the 0G integration guide](zero-g-integration.md) for configuration, endpoints and retention.

### Validation

- Frozen dependency installation, strict type checking, lint, 37 automated tests and the production build passed.
- Automated provider tests use synthetic responses for metadata, billing and authorization errors, retry and timeout handling, output validation and private routing. The persistence test reopens a real SQLite file.

- A production browser smoke test used an explicitly synthetic 0G transport. It passed Markdown upload, extraction, metadata display, filtering, evidence inspection, edit and approval, reload, rejection, dashboard status, and Step 1 route checks.

### Live sponsor status

**0G live inference verification · BLOCKED.** No funded Router API key was configured during implementation. No real request ID, usage, or attestation result was recorded. The integration remains unverified until a genuine extraction passes schema and source checks. Arkiv, Hedera, receiving-agent evaluation and passport issuance remain pending. The next validation milestone is a funded 0G smoke run using the documented non-sensitive sample.
