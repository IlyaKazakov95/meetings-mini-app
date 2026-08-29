"use client";

import { addDays, format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { dayLabel, formatWeekRange, weekStartIso } from "@/lib/week";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { MeetingCard } from "@/features/meetings/meeting-card";
import type { HomeCounters, MeetingListItem } from "@/types/domain";

type ViewMode = "agenda" | "calendar";

export function MeetingsHome() {
  const [weekStart, setWeekStart] = useState(weekStartIso());
  const [view, setView] = useState<ViewMode>("agenda");
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [counters, setCounters] = useState<HomeCounters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<{ meetings: MeetingListItem[] }>(`/api/meetings?weekStart=${weekStart}`),
      api<{ counters: HomeCounters }>("/api/home"),
    ])
      .then(([meetingData, homeData]) => {
        if (cancelled) return;
        setMeetings(meetingData.meetings);
        setCounters(homeData.counters);
        setError(null);
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const grouped = useMemo(() => {
    const map = new Map<string, MeetingListItem[]>();
    for (const meeting of meetings) {
      const list = map.get(meeting.meetingDate) ?? [];
      list.push(meeting);
      map.set(meeting.meetingDate, list);
    }
    return Array.from(map.entries());
  }, [meetings]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => format(addDays(parseISO(weekStart), index), "yyyy-MM-dd")),
    [weekStart],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meetings</h1>
        <div className="flex rounded-full bg-card p-1 text-sm">
          {(["agenda", "calendar"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`rounded-full px-3 py-1.5 capitalize ${view === mode ? "bg-accent text-accent-fg" : "text-muted"}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {counters ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <Counter label="Today" value={counters.meetingsToday} />
          <Counter label="Respond" value={counters.needResponse} />
          <Counter label="Actions" value={counters.openActions} />
          <Counter label="Overdue" value={counters.overdue} />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button className="rounded-full bg-card px-3 py-2" onClick={() => setWeekStart(format(addDays(parseISO(weekStart), -7), "yyyy-MM-dd"))}>
          ‹
        </button>
        <div className="flex-1 text-center font-medium">{formatWeekRange(weekStart)}</div>
        <button className="rounded-full bg-card px-3 py-2" onClick={() => setWeekStart(format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd"))}>
          ›
        </button>
        <button className="rounded-full bg-card px-3 py-2 text-sm" onClick={() => setWeekStart(weekStartIso())}>
          Today
        </button>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} /> : null}

      {!loading && !error && meetings.length === 0 ? (
        <EmptyState title="No meetings" text="Nothing scheduled for this week." />
      ) : null}

      {!loading && view === "agenda"
        ? grouped.map(([date, items]) => (
            <section key={date} className="space-y-3">
              <h2 className="text-xs font-semibold tracking-wide text-muted">{dayLabel(date)}</h2>
              {items.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </section>
          ))
        : null}

      {!loading && view === "calendar" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const count = meetings.filter((meeting) => meeting.meetingDate === date).length;
              return (
                <div key={date} className="rounded-2xl bg-card px-1 py-3 text-center">
                  <div className="text-[11px] text-muted">{format(parseISO(date), "EEE")}</div>
                  <div className="mt-1 text-sm font-semibold">{format(parseISO(date), "d")}</div>
                  <div className="mt-2 text-xs text-accent">{count || "·"}</div>
                </div>
              );
            })}
          </div>
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card px-2 py-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
