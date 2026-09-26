"use client";

import { useEffect } from "react";
import { LATEST_NEWS, RELEASES } from "@/lib/changelog";
import { markVersionSeen } from "@/lib/seen-version";
import { PageHeader } from "@/components/app-chrome";

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

export default function ChangelogPage() {
  useEffect(() => {
    markVersionSeen();
  }, []);

  return (
    <>
      <PageHeader back title="Co nowego" />
      <main className="space-y-6 px-4 pb-6">
        {RELEASES.map((release) => (
          <section key={release.version} className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold tabular-nums text-primary">
                {release.version}
              </span>
              <h2 className="min-w-0 flex-1 font-semibold">{release.title}</h2>
              {release.version === LATEST_NEWS && <span className="text-xs text-muted-foreground">najnowsze</span>}
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(release.date)}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {release.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
