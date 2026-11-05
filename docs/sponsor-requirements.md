# Sponsor requirements

Portavate · ETHGlobal Mumbai 2026 · Requirements baseline checked November 5, 2026

This document separates sponsor qualification from Portavate acceptance criteria. The repository is at the design stage. The [README](../README.md) describes the product and the [architecture decisions](architecture-decisions.md) define how implementation must enforce this contract.

## Event submission

Submit through the Hacker Dashboard by **November 7, 2026 at 9:00 AM IST** and select the three partner prizes below. Keep incremental commits, identify reused work, disclose AI assistance, and retain prompts and planning artifacts if using a spec-driven workflow. Classic eligibility depends on starting project work after the official kickoff. Record when the initial brief and design work were prepared and confirm with organizers if any of it predates kickoff. Use a single demo under three minutes to satisfy both video limits, with a visible payment settlement and a clickable HashScan reference in the submission materials. [Event rules](https://ethglobal.com/events/mumbai/info/details) · [Official prize requirements](https://ethglobal.com/events/mumbai/prizes)

| Priority | Track | Pool | Published placement amounts |
| --- | --- | ---: | --- |
| 1 | AI Agents That Pay: x402 on Hedera | $6,500 | $3,000 / $2,000 / $1,500 |
| 2 | Build on Arkiv (from scratch) | $4,000 | $3,000 / $1,000 |
| 3 | Build with 0G Private Computer | $5,000 | $2,500 / $1,500 / $1,000 |

## Hedera · Pay for independent verification

**Qualification.** Provide a genuine x402-protected endpoint settling on Hedera testnet or mainnet. The event lists Official x402, Ax402, Blocky402 and compatible self-operated facilitators. Demonstrate a client discovering the endpoint and completing a paid request without an individual human approval. Provide a public GitHub repository with README setup, architecture, payment flow and a settled Hedera transaction ID. Provide a demo video of at most five minutes showing settlement and linking to HashScan. [Hedera prize](https://ethglobal.com/events/mumbai/prizes#hedera)

**Portavate acceptance.** Run a separately deployable verifier selling a real continuity assessment. The receiving agent discovers it through an authenticated configuration or service descriptor and requests a run. The HTTP 402 challenge quotes the asset, amount, merchant and network. The agent checks its existing budget and merchant policy before signing the transfer and retrying. The facilitator verifies and submits settlement. Confirm the actual receipt before performing paid checks, then bind the receipt to the immutable verification request. An owner can configure policy in advance and the qualifying payment must execute autonomously. HBAR or a supported HTS asset can fund the buyer. Confirm token association, asset support and facilitator fee-payer behavior for the selected network. [Hedera x402](https://docs.hedera.com/solutions/ai/x402/how-it-works) · [Client setup](https://docs.hedera.com/solutions/ai/x402/pay-with-x402) · [Merchant integration](https://docs.hedera.com/solutions/ai/x402/merchant-integration) · [Exact scheme](https://docs.hedera.com/solutions/ai/x402/exact-scheme)

**Evidence to collect.** Endpoint discovery and sanitized challenge/retry trace, selected facilitator and network, successful transaction ID and HashScan link, verifier request ID and receipt binding, and actual test results. Demonstrate a budget rejection without signing and a retry without another charge. Never publish keys or reusable payment payloads. Without settlement, the verifier cannot fulfill the paid run or issue a completed passport.

**Optional scoring opportunities.** Spending controls, allowlists, HCS-14 or ERC-8004 identity, HCS spend audit, A2A/ACP negotiation, HTS settlement, scheduled payments, Hedera Agent Kit and Hedera Network MCP. Budget and merchant controls are required by Portavate even though they are extra credit for the sponsor. [Facilitators](https://docs.hedera.com/solutions/ai/x402/facilitators) · [x402 protocol](https://github.com/x402-foundation/x402) · [Agent Kit](https://docs.hedera.com/solutions/ai/agent-kit) · [Hedera MCP](https://docs.hedera.com/solutions/ai/hosted-mcp-server)

## Arkiv · Discover the current memory version

**Qualification.** Build from scratch at the event. Write real entities to the current testnet via `@arkiv-network/sdk` or JSON-RPC and demonstrate a user-visible feature reading from Arkiv. Include all publishing wallets and a runnable query in the README. Provide the required files below, a public repository with an open-source license, and AI-use disclosure. The license remains a submission prerequisite. [Arkiv prize](https://ethglobal.com/events/mumbai/prizes#arkiv)

**Portavate acceptance.** Publish wallet-owned public version records. The recipient and verifier use the registry to resolve the current eligible record, validate ownership, lineage, expiry and commitment, and reject stale or invalid versions. Show a version update changing what the recipient can accept. Keep private context and decryption material in the offchain artifact service. Without a valid registry read, the handoff stops.

**Testnet baseline.** Rabdi DB-Chain, chain ID `7794095`. Recheck these endpoints and access requirements before configuring the integration. [Arkiv documentation](https://docs.arkiv.network/) · [RPC](https://rpc.rabdi.db-chain.testnet.arkiv.network) · [Explorer](https://rabdi.explorer.arkiv.network) · [Indexer](https://indexer.rabdi.db-chain.testnet.arkiv.network) · [Faucet](https://hub.arkiv.network/faucet) · [Access keys](https://hub.arkiv.network/access-keys)

| Required submission file | Content to capture during implementation | Judging weight |
| --- | --- | --- |
| `arkiv/schema.md` | Entity types, queryable fields, write ownership and expiry | Required schema reference |
| `arkiv/friction.md` | Actual feedback, expected and observed behavior, reproducible steps where applicable | 25% |
| `arkiv/reach.md` | Intended users, evidence of usability or adoption, and plans beyond the event | 25% |
| `arkiv/why-arkiv.md` | Independent discovery and freshness checks, and why private data stays offchain | 25% |
| `arkiv/how-you-use-arkiv.md` | How filters, ownership and expiry change behavior the user can see | 25% |

**Evidence to collect.** Publishing wallets, live entity keys, network, a runnable query with expected output, and a reproducible version change or expiry demonstration. Fill the required files with actual observations, links, measurements or queries.

## 0G · Prepare and assess memory

**Qualification.** Show real Private Computer inference with request IDs in the main flow. Provide a working app judges can try, a reason to return, and a one-sentence explanation of what breaks without 0G. Submit a project name and description, public repo with setup, live demo, video under three minutes, contract deployment addresses if applicable, and team names and Telegram/X contacts. [0G prize](https://ethglobal.com/events/mumbai/prizes#0g)

**Portavate acceptance.** Use 0G to extract evidence-linked memory, prepare destination context, generate checks, evaluate actual recipient responses and propose targeted repairs. Users return to reverify handoffs when decisions or requirements change. Without 0G, Portavate cannot prepare, evaluate or repair a verified handoff. Treat the OpenAI-compatible API, verification mode and private mode as distinct concerns. Sensitive jobs require a supported private route and its applicable evidence. [0G Private Computer](https://pc.0g.ai/) · [0G Compute docs](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/overview)

**Evidence to collect.** Associate actual provider request IDs with the handoff stages and evaluation attempts. Record model, route, time and supported receipt or attestation references. Demonstrate a failed check and evidence-grounded repair without publishing raw private prompts or outputs.

**Optional iAI bonus.** Demonstrate user sign-in and the balance decreasing from actual use. Confirm sponsor-provided Privy configuration, allowed localhost ports and credit availability before attempting the bonus. Complete the core handoff first. [iAI](https://iai.finance/) · [iAI documentation](https://iai.finance/docs)

## Release evidence and verification gates

All evidence above is pending implementation. A single real handoff should tie together the Arkiv entity and queried version, the 0G request IDs, the settled Hedera transaction, the recipient responses, and the signed passport. Reproduce that run from the public setup instructions with an approved demo fixture. Demonstrate that an invalid or unavailable dependency blocks completion. Before choosing SDKs or deploying, confirm the supported Hedera network, asset, facilitator and settlement schema, Arkiv SDK/API and active testnet semantics, and 0G model, private route and evidence fields. Recheck the dashboard and sponsor pages before submitting.
