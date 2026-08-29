"use client";

import Link from "next/link";
import { formatTimeRange } from "@/lib/utils";
import type { MeetingListItem } from "@/types/domain";

export function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  const time = formatTimeRange(meeting.startTime, meeting.endTime) ?? "Time TBD";

  return (
    <Link href={`/meetings/${meeting.id}`} className="block rounded-3xl bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-accent">{meeting.startTime ?? time}</p>
          <h3 className="mt-1 text-lg font-semibold">{meeting.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {meeting.topicCount} {meeting.topicCount === 1 ? "topic" : "topics"}
          </p>
        </div>
        {meeting.meetingLink ? (
          <span className="rounded-full bg-bg px-3 py-1 text-xs text-link">🔗 Join</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span>✅ {meeting.attendance.going}</span>
        <span>❓ {meeting.attendance.maybe}</span>
        <span>❌ {meeting.attendance.notGoing}</span>
        {!meeting.myAttendance ? (
          <span className="rounded-full bg-bg px-2 py-1 text-xs text-accent">Needs response</span>
        ) : null}
      </div>
    </Link>
  );
}
