"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import type { Meeting } from "@/types/domain";

export function CreateMeetingForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const data = await api<{ meeting: Meeting }>("/api/meetings", {
            method: "POST",
            body: JSON.stringify({
              title,
              meetingDate,
              startTime: startTime || null,
              endTime: endTime || null,
              meetingLink: meetingLink || null,
            }),
          });
          router.push(`/meetings/${data.meeting.id}`);
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Failed");
        }
      }}
    >
      <h1 className="text-2xl font-semibold">Create meeting</h1>
      <input required placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <input required type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
      </div>
      <input placeholder="Meeting link" value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button className="h-12 w-full rounded-2xl bg-accent font-semibold text-accent-fg">Create</button>
    </form>
  );
}
