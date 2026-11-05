import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { benchmarkConditions } from "@portavate/benchmark";

const sections = {
  library: ["Memory Library", "No published versions", "Open saved drafts from Import Memory. Published versions will appear here after registry publishing and private storage are available."],
  handoffs: ["Handoffs", "No handoffs recorded", "Handoffs will show recipient access, payment settlement, continuity checks, and any issued passport."],
  benchmark: ["Benchmark Lab", "No benchmark runs", "The planned comparison uses the same tasks and receiving model across three context conditions."],
  settings: ["Settings", "Account settings are pending", "Recipient permissions, approved merchants, and agent spending limits will appear here once account and authorization workflows are available."],
} as const;

type Props = { params: Promise<{ section: string }> };

function findSection(section: string) {
  if (!Object.hasOwn(sections, section)) notFound();
  return sections[section as keyof typeof sections];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [title] = findSection((await params).section);
  return { title };
}

export default async function Section({ params }: Props) {
  const { section } = await params;
  const [title, heading, description] = findSection(section);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="mb-2 text-xs font-bold tracking-widest text-accent uppercase">Workspace</p>
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      </header>
      <section className="rounded-2xl border border-line bg-panel p-7">
        <h2 className="text-xl font-semibold">{heading}</h2>
        <p className="mt-2 max-w-xl leading-7 text-muted">{description}</p>
        {section === "benchmark" && (
          <ul className="mt-3 list-inside list-disc text-sm leading-7 text-muted">
            {Object.values(benchmarkConditions).map((label) => <li key={label}>{label}</li>)}
          </ul>
        )}
        <Link href="/" className="mt-5 inline-block text-sm font-semibold text-accent underline underline-offset-4">Back to dashboard</Link>
      </section>
    </div>
  );
}
