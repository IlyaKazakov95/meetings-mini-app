import type { ParsedExcelRow } from "@/types/import";

export function forwardFillMergedValues(rows: ParsedExcelRow[]): ParsedExcelRow[] {
  let lastDate: string | null = null;
  let lastMeeting: string | null = null;
  let lastLink: string | null = null;
  let lastMeetingKey: string | null = null;

  return rows.map((row) => {
    const date = row.date || lastDate;
    const meeting = row.meeting || lastMeeting;
    const meetingKey = date && meeting ? `${date}__${meeting}` : null;

    if (meetingKey !== lastMeetingKey) {
      lastLink = row.meetingLink;
    } else if (row.meetingLink) {
      lastLink = row.meetingLink;
    }

    const meetingLink = row.meetingLink || (meetingKey === lastMeetingKey ? lastLink : row.meetingLink);

    lastDate = date;
    lastMeeting = meeting;
    lastMeetingKey = meetingKey;

    return {
      ...row,
      date,
      meeting,
      meetingLink,
    };
  });
}
