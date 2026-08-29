"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getInitData } from "@/lib/api/client";
import { formatTimeRange } from "@/lib/utils";
import { formatMeetingDate } from "@/lib/week";
import { EmptyState, ErrorState } from "@/components/ui/states";
import type { ImportRecord } from "@/types/domain";
import type { ImportPreview, PreviewMeeting } from "@/types/import";

export function ImportScreen() {
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [result, setResult] = useState<ImportRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api<{ imports: ImportRecord[] }>("/api/imports")
      .then((data) => setHistory(data.imports))
      .catch(() => undefined);
  }, [result]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/imports/parse", {
        method: "POST",
        headers: { "x-telegram-init-data": getInitData() },
        body: form,
        credentials: "include",
      });
      const data = (await response.json()) as {
        import?: ImportRecord;
        preview?: ImportPreview;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Import failed");
      setImportId(data.import?.id ?? null);
      setPreview(data.preview ?? null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Import completed</h1>
        <div className="rounded-3xl bg-card p-4 text-sm">
          <p>{(result.meetingsCreated ?? 0) + (result.meetingsUpdated ?? 0)} meetings processed</p>
          <p>{result.meetingsCreated} created</p>
          <p>{result.meetingsUpdated} updated</p>
          <p>{result.agendaItemsCreated} agenda topics</p>
          <p>{result.errorLog?.warnings.length ?? 0} warnings</p>
          <p>{result.errorLog?.errors.length ?? 0} errors</p>
        </div>
        <Link href="/meetings" className="block h-12 rounded-2xl bg-accent text-center leading-[48px] font-semibold text-accent-fg">
          View meetings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Import Schedule</h1>

      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-card px-4 text-center">
        <input
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <p className="font-medium">{busy ? "Parsing…" : "Drop XLSX or tap to upload"}</p>
        <p className="mt-1 text-sm text-muted">Max 5 MB. Preview before confirm.</p>
      </label>

      <a
        href="/api/imports/template"
        className="block rounded-2xl bg-card py-3 text-center text-sm"
        onClick={async (event) => {
          event.preventDefault();
          const response = await fetch("/api/imports/template", {
            headers: { "x-telegram-init-data": getInitData() },
          });
          if (!response.ok) {
            setError("Could not download template");
            return;
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "meeting_schedule_template.xlsx";
          link.click();
          URL.revokeObjectURL(url);
        }}
      >
        Download Template
      </a>

      {error ? <ErrorState message={error} /> : null}

      {preview ? (
        <div className="space-y-3">
          <div className="rounded-3xl bg-card p-4 text-sm">
            <p>{preview.meetingsFound} meetings found</p>
            <p>{preview.agendaTopics} agenda topics</p>
            <p>{preview.newMeetings} new meetings</p>
            <p>{preview.updatedMeetings} meeting updates</p>
            <p>{preview.unchangedMeetings} unchanged</p>
            <p>{preview.errorCount} errors</p>
            <p>{preview.warningCount} warnings</p>
          </div>

          {preview.errors.length > 0 ? (
            <div className="rounded-3xl bg-card p-4 text-sm text-danger">
              <p className="font-semibold">Validation failed</p>
              {preview.errors.slice(0, 8).map((issue, index) => (
                <p key={`${issue.code}-${index}`}>
                  {issue.rowNumber ? `Row ${issue.rowNumber}: ` : ""}
                  {issue.message}
                </p>
              ))}
            </div>
          ) : null}

          {preview.warnings.slice(0, 8).map((issue, index) => (
            <p key={`${issue.code}-${index}`} className="text-sm text-muted">
              {issue.message}
            </p>
          ))}

          {preview.meetings.map((meeting) => (
            <PreviewCard
              key={meeting.externalId}
              meeting={meeting}
              open={openId === meeting.externalId}
              onToggle={() => setOpenId((value) => (value === meeting.externalId ? null : meeting.externalId))}
            />
          ))}

          <button
            disabled={!preview.canImport || !importId || busy}
            className="h-12 w-full rounded-2xl bg-accent font-semibold text-accent-fg disabled:opacity-40"
            onClick={async () => {
              if (!importId) return;
              setBusy(true);
              try {
                const data = await api<{ import: ImportRecord }>("/api/imports/confirm", {
                  method: "POST",
                  body: JSON.stringify({ importId }),
                });
                setResult(data.import);
              } catch (confirmError) {
                setError(confirmError instanceof Error ? confirmError.message : "Import failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm Import
          </button>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted">RECENT IMPORTS</h2>
        {history.length === 0 ? <EmptyState title="No imports yet" /> : null}
        {history.slice(0, 5).map((item) => (
          <Link key={item.id} href="/admin/imports" className="block rounded-3xl bg-card p-4 text-sm">
            <p className="font-medium">{item.filename}</p>
            <p className="text-muted">
              {item.status} · {item.rowsTotal ?? 0} rows · {item.meetingsCreated ?? 0} created · {item.meetingsUpdated ?? 0} updated
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}

function PreviewCard({
  meeting,
  open,
  onToggle,
}: {
  meeting: PreviewMeeting;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="block w-full rounded-3xl bg-card p-4 text-left">
      <p className="text-sm text-muted">{formatMeetingDate(meeting.meetingDate)}</p>
      <h3 className="text-lg font-semibold">{meeting.title}</h3>
      <p className="text-sm text-muted">
        {formatTimeRange(meeting.startTime, meeting.endTime)} · {meeting.topicCount} agenda topics
      </p>
      <p className="mt-1 text-sm">{meeting.meetingLink ? "Meeting link: available" : "Meeting link: missing"}</p>
      <p className="mt-1 text-xs uppercase text-accent">{meeting.operation}</p>
      {open ? (
        <div className="mt-3 space-y-3">
          {meeting.agenda.map((item) => (
            <div key={`${item.sourceRowNumber}-${item.topic}`} className="rounded-2xl bg-bg p-3">
              <p className="text-sm text-accent">{formatTimeRange(item.startTime, item.endTime)}</p>
              <p className="font-medium">{item.topic}</p>
              {item.responsibleText ? (
                <p className="mt-2 whitespace-pre-wrap text-sm">Responsible: {item.responsibleText.replace(/;\s*/g, "\n")}</p>
              ) : null}
              {item.outcomeExpected ? (
                <p className="mt-2 whitespace-pre-wrap text-sm">Expected outcome: {item.outcomeExpected}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </button>
  );
}
