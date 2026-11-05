import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Navigation } from "./navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Portavate", template: "%s · Portavate" },
  description: "Your AI memory. Anywhere. Verified.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-panel focus:p-3">Skip to content</a>
        <div className="mx-auto grid min-h-screen max-w-[100rem] lg:grid-cols-[15rem_1fr]">
          <aside className="border-b border-line bg-panel px-5 py-5 lg:border-r lg:border-b-0 lg:py-8">
            <Link href="/" className="mb-5 flex w-fit items-center gap-3 font-bold tracking-tight lg:mb-10">
              <span aria-hidden className="grid size-9 place-items-center rounded-xl bg-tint font-mono text-accent">P</span>
              Portavate
            </Link>
            <p className="mb-2 px-3 text-xs font-semibold tracking-widest text-muted uppercase">Workspace</p>
            <Navigation />
          </aside>
          <main id="content" className="w-full min-w-0 px-5 py-7 sm:px-8 lg:px-12 lg:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
