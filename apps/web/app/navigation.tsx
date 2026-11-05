"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Dashboard"],
  ["/import", "Import Memory"],
  ["/library", "Memory Library"],
  ["/handoffs", "Handoffs"],
  ["/benchmark", "Benchmark Lab"],
  ["/settings", "Settings"],
] as const;

export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace" className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
      {links.map(([href, label], index) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-canvas aria-[current=page]:bg-tint aria-[current=page]:font-semibold aria-[current=page]:text-accent">
          <span aria-hidden className="font-mono text-xs">0{index + 1}</span>{label}
        </Link>
      ))}
    </nav>
  );
}
