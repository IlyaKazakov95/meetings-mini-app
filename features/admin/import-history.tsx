"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import type { ImportRecord } from "@/types/domain";

export function ImportHistory() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ imports: ImportRecord[] }>("/api/imports")
      .then((data) => setImports(data.imports))
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (imports.length === 0) return <EmptyState title="No imports yet" />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Imports</h1>
      {imports.map((item) => (
        <article key={item.id} className="rounded-3xl bg-card p-4 text-sm">
          <h2 className="font-semibold">{item.filename}</h2>
          <p className="text-muted">
            {format(new Date(item.uploadedAt), "d MMM HH:mm")}
            {item.uploadedByName ? ` · ${item.uploadedByName}` : ""}
          </p>
          <p className="mt-2">
            {item.rowsTotal ?? 0} rows · {item.meetingsCreated ?? 0} created · {item.meetingsUpdated ?? 0} updated
          </p>
          <p>
            {item.agendaItemsCreated ?? 0} topics · {item.errorLog?.errors.length ?? 0} errors ·{" "}
            {item.errorLog?.warnings.length ?? 0} warnings
          </p>
          <p className="mt-1 capitalize text-accent">{item.status}</p>
        </article>
      ))}
    </div>
  );
}
