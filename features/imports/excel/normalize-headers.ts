import type { HeaderField } from "@/types/import";

const HEADER_ALIASES: Record<HeaderField, string[]> = {
  date: ["date", "meeting date", "meeting_date", "дата"],
  meeting: ["meeting", "meeting name", "meeting_name", "встреча"],
  topic: ["topic", "agenda", "agenda topic", "agenda_topic", "топик"],
  startTime: ["start time", "start_time", "time start", "start", "начало"],
  endTime: ["end time", "end_time", "time end", "end", "окончание"],
  who: ["who", "responsible", "owner", "presenter", "ответственный"],
  outcomeExpected: [
    "outcome expected",
    "outcome_expected",
    "expected outcome",
    "outcome",
    "ожидаемый результат",
  ],
  meetingLink: [
    "meeting link",
    "meeting_link",
    "link",
    "teams link",
    "join link",
    "ссылка",
  ],
};

export function normalizeHeaderLabel(value: unknown): string {
  return String(value ?? "")
    .replace(/[\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function matchHeaderField(value: unknown): HeaderField | null {
  const normalized = normalizeHeaderLabel(value);
  if (!normalized) return null;

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [HeaderField, string[]]
  >) {
    if (aliases.includes(normalized)) {
      return field;
    }
  }

  return null;
}

export function normalizeHeaders(
  headers: unknown[],
): Map<HeaderField, number> {
  const map = new Map<HeaderField, number>();

  headers.forEach((header, index) => {
    const field = matchHeaderField(header);
    if (field && !map.has(field)) {
      map.set(field, index);
    }
  });

  return map;
}
