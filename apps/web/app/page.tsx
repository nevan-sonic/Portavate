import Link from "next/link";
import { applicationStatusSchema } from "@portavate/shared";
import type { ApplicationStatus } from "@portavate/shared";
import { readServerConfig } from "@portavate/shared/config";

const services = {
  zeroG: ["0G Private Computer", "Source-grounded memory extraction"],
  arkiv: ["Arkiv", "Current memory version discovery"],
  hederaX402: ["Hedera x402", "Autonomous verification payments"],
  receivingAgent: ["Receiving agent", "Actual responses to continuity checks"],
  verification: ["Paid verifier", "Independent evaluation and passports"],
} as const;

const stateLabels = {
  not_implemented: "Not implemented",
  not_configured: "Not configured",
  configured_unverified: "Configured · unverified",
  verified_live: "Live inference tested",
  unavailable: "Unavailable",
} as const;

async function loadStatus(): Promise<ApplicationStatus | null> {
  try {
    const config = readServerConfig(process.env);
    const response = await fetch(new URL("/api/status", config.API_URL), {
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return null;
    const status = applicationStatusSchema.safeParse(await response.json());
    return status.success ? status.data : null;
  } catch {
    return null;
  }
}

export default async function Dashboard() {
  const status = await loadStatus();
  const readiness = status && { foundation: "Foundation", operational: "Operational", degraded: "Degraded" }[status.readiness];
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="rounded-3xl border border-line bg-panel p-7 sm:p-10">
        <p className="mb-4 text-xs font-bold tracking-widest text-accent uppercase">Continuity workspace</p>
        <h1 className="max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">Your AI memory.<br />Anywhere. Verified.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted">Portavate is building a way to transfer approved project knowledge between AI assistants and verify how well the receiving agent can use it.</p>
      </header>
      <section aria-labelledby="status" className="rounded-2xl border border-line bg-panel p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="status" className="text-lg font-semibold">Integration readiness</h2>
          <span className="rounded-full bg-tint px-3 py-1 text-xs font-semibold text-accent">{readiness ?? "Status unavailable"}</span>
        </div>
        {status ? (
          <ul className="divide-y divide-line">
            {(Object.keys(services) as (keyof typeof services)[]).map((key) => (
              <li key={key} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-medium">{services[key][0]}</p><p className="text-sm text-muted">{services[key][1]}</p></div>
                <span className="rounded-md bg-canvas px-2 py-1 text-xs text-muted">{stateLabels[status.integrations[key]]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status" className="text-sm text-muted">The API status could not be retrieved. Check that the API is running and reload this page.</p>
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="font-semibold">Available now</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Import authorized source material and review grounded draft claims in the local workspace.</p>
        </section>
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="font-semibold">Next milestone</h2>
          <p className="mt-2 text-sm leading-6 text-muted">The first live slice starts with an approved import and one receiving model.</p>
          <Link href="/import" className="mt-3 inline-block text-sm font-semibold text-accent underline underline-offset-4">Open Import Memory</Link>
        </section>
      </div>
    </div>
  );
}
