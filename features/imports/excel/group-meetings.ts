import type { PreviewAgendaItem, ValidatedExcelRow } from "@/types/import";
import { buildMeetingExternalId } from "./external-id";
import { minutesFromTime } from "./normalize-time";

export interface GroupedMeeting {
  externalId: string;
  title: string;
  meetingDate: string;
  startTime: string | null;
  endTime: string | null;
  meetingLink: string | null;
  agenda: PreviewAgendaItem[];
  sourceRows: ValidatedExcelRow[];
  linkValues: string[];
}

function compareAgenda(a: ValidatedExcelRow, b: ValidatedExcelRow): number {
  const aMinutes = a.startTime ? minutesFromTime(a.startTime) : null;
  const bMinutes = b.startTime ? minutesFromTime(b.startTime) : null;

  if (aMinutes !== null && bMinutes !== null && aMinutes !== bMinutes) {
    return aMinutes - bMinutes;
  }
  if (aMinutes !== null && bMinutes === null) return -1;
  if (aMinutes === null && bMinutes !== null) return 1;
  return a.sourceRowNumber - b.sourceRowNumber;
}

function timedValues(times: Array<string | null>): Array<{ time: string; minutes: number }> {
  const values: Array<{ time: string; minutes: number }> = [];
  for (const time of times) {
    if (!time) continue;
    const minutes = minutesFromTime(time);
    if (minutes === null) continue;
    values.push({ time, minutes });
  }
  return values;
}

function minTime(times: Array<string | null>): string | null {
  const values = timedValues(times);
  if (values.length === 0) return null;
  return values.reduce((best, item) => (item.minutes < best.minutes ? item : best)).time;
}

function maxTime(times: Array<string | null>): string | null {
  const values = timedValues(times);

  if (values.length === 0) return null;
  return values.reduce((best, item) => (item.minutes > best.minutes ? item : best)).time;
}

export function groupRowsIntoMeetings(rows: ValidatedExcelRow[]): GroupedMeeting[] {
  const groups = new Map<string, ValidatedExcelRow[]>();

  for (const row of rows) {
    if (!row.date || !row.meeting || row.errors.length > 0) {
      continue;
    }

    const key = buildMeetingExternalId(row.date, row.meeting);
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  return Array.from(groups.entries()).map(([externalId, groupRows]) => {
    const sorted = [...groupRows].sort(compareAgenda);
    const title = sorted[0]?.meeting ?? "";
    const meetingDate = sorted[0]?.date ?? "";
    const linkValues = Array.from(
      new Set(
        sorted
          .map((row) => row.meetingLink)
          .filter((link): link is string => Boolean(link)),
      ),
    );

    const agenda: PreviewAgendaItem[] = sorted.map((row, index) => ({
      topic: row.topic ?? "",
      startTime: row.startTime,
      endTime: row.endTime,
      responsibleText: row.who,
      outcomeExpected: row.outcomeExpected,
      sourceRowNumber: row.sourceRowNumber,
      sortOrder: index,
    }));

    return {
      externalId,
      title,
      meetingDate,
      startTime: minTime(sorted.map((row) => row.startTime)),
      endTime: maxTime(sorted.map((row) => row.endTime)),
      meetingLink: linkValues[0] ?? null,
      agenda,
      sourceRows: sorted,
      linkValues,
    };
  });
}
