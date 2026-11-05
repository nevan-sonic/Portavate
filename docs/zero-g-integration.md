# 0G memory extraction

## Configure local import

Use Node.js 24 or 26 LTS and pnpm 11.25.0. Copy `.env.example` to `.env` in the repository root. Generate a local token and paste the result into `PORTAVATE_ALPHA_TOKEN`.

~~~sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
pnpm install --frozen-lockfile
pnpm dev
~~~

At [0G Private Computer](https://pc.0g.ai/), open the Router dashboard, fund the account or obtain event credits, and create an inference-capable key. Set `ZERO_G_API_KEY` in the root `.env` and restart the services. Portavate sends it as a Bearer token from the API process. Mainnet and testnet use separate keys and balances. Use the two official router endpoints shown in `.env.example` and the [Router overview](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/overview).

`ZERO_G_MODEL` defaults to `glm-5.3`. Its model card lists JSON mode and private providers. Before changing it, check the catalog for an exact chat model ID, JSON mode support, and an eligible provider for your trust mode. Model availability and pricing vary by provider and network. [Model card](https://pc.0g.ai/models/glm-5.3) · [Chat completions](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/chat-completions)

## Import and review

Open [Import Memory](http://localhost:3000/import). Paste authorized content or upload a UTF-8 `.txt`, `.md`, or conversation `.json` file of up to 16 KiB. The JSON format is Portavate's simple interchange format for manual imports.

~~~json
{
  "messages": [
    { "role": "user", "content": "Decision: Use SQLite for the local alpha." },
    { "role": "assistant", "content": "Constraint: Bind the services to loopback. Pending task: Document database setup." }
  ]
}
~~~

Use `user`, `assistant`, or `system` roles and up to 100 nonblank messages. All imported roles are untrusted source data. Portavate stores the original text and its SHA-256 commitment, assigns stable segment IDs in source order, and divides each message or text document into passages of at most 2,000 Unicode code points. It skips whitespace-only passages and sends the remaining passages in a single bounded request. Oversized sources must be split manually. A provider context error or truncated completion fails the request. Output is limited to 24 claims per import.

Each proposed item starts pending and owner-only. Portavate checks that the segment ID exists and the exact quote occurs in that passage. A real quote can still fail to support the claim. Inspect the full passage, edit the claim if needed, and approve or reject it. An edit retains the original quote for comparison. The approved-package preview includes only approved items. If extraction fails, retry the saved source without importing it again.

## Trust modes and evidence

`ZERO_G_TRUST_MODE` defaults to `verified`. A sensitive source always requests `private` with `X-0G-Provider-Trust-Mode`, regardless of that default. Portavate requests `verify_tee: true`, disables cross-provider fallback, and rejects a sensitive extraction unless the response trace reports successful TEE verification. The Router enforces the requested provider tier. Portavate records the Router's report and does not independently validate attestation or implement the optional encrypted transit client. [Provider routing](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/provider-routing) · [0G privacy modes](https://0g.ai/blog/data-privacy-on-0g-private-computer)

The adapter requests JSON mode and validates the final output against versioned Zod schemas. It requires `x_0g_trace.request_id` and stores the returned model, requested trust mode, receipt time, optional Router-reported `tee_verified`, and standard token counts when supplied. A completion ID is a separate identifier. Missing Router IDs block draft creation. After a real, grounded extraction succeeds, the API reports `verified_live` for that process. This signals successful live inference and does not assert independent cryptographic proof. Restart resets readiness to `configured_unverified` when a key is present.

The deadline is 45 seconds per request. One retry is allowed for a short 429, 502 or 504 response within a 1.5-second delay budget. Longer `Retry-After` values surface an error so the operator can wait. Transport timeouts are not retried automatically because billing can be ambiguous. Requests may consume credits even when an output fails validation. API responses and logs omit raw provider diagnostics, keys and prompt content. [Rate limits](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/rate-limits) · [Router errors](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/errors)

## Local database and API

SQLite opens and applies schema migration 1 on the first authorized memory request. There is no separate database service. The default file is `.portavate/memory.sqlite` at the repository root. Set `PORTAVATE_MEMORY_DB` to an absolute path to relocate it. The database contains raw source, passages, drafts, review status and inference metadata in plaintext. It is ignored by Git at the default location. There is no automatic expiration, multi-user authorization or encrypted artifact store. To remove all saved imports, stop the API and delete the local database and any SQLite sidecar files. Keep the database outside shared or synced directories and only use the alpha on a trusted machine.

The browser uses same-origin Next.js routes. The Next.js server attaches the alpha token when forwarding to the loopback API. Direct clients need `Authorization: Bearer <PORTAVATE_ALPHA_TOKEN>`. The API disables the memory routes when bound to a non-loopback host. Keep the UI local and avoid forwarding its port. The token protects API access, and any user with access to the local web app can act as the alpha owner.

| Method and path | Contract |
| --- | --- |
| POST /api/memory/sources | JSON with name, format, text, sourceType and sensitive. Returns a source ID. |
| GET /api/memory/sources | Lists the latest 100 saved imports, with an indicator for existing drafts. |
| POST /api/memory/sources/:id/extractions | Starts one extraction or returns the existing draft. Takes no client-supplied inference evidence. |
| GET /api/memory/drafts/:id | Returns the draft, source quotes, inference metadata and review revision. |
| GET /api/memory/sources/:id/evidence/:segmentId | Returns the saved passage and its label. |
| PATCH /api/memory/drafts/:id/items/:itemId | Takes revision, content, reviewStatus, visibility and sensitivity. Returns the updated draft, or 409 if stale. |

## Reproduce a live verification

Configure a funded Router key and submit the small JSON sample above. Check the decision, constraint and pending task against the source. Record the returned model, requested mode, Router request ID, receipt timestamp, schema validation and source resolution. Also confirm the dashboard changes from configured to live inference tested. Retain only safe metadata for sponsor evidence.

**Current result · BLOCKED.** No funded 0G API key was available for this Step 2 run. Automated tests use synthetic responses, which cannot promote readiness to live. The public model catalog check established availability of the model identifier only.
