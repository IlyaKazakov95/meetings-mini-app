import type { ImportRowIssue, PreviewAgendaItem } from "@/types/import";
import { minutesFromTime } from "./normalize-time";

interface TimedItem {
  topic: string;
  start: number;
  end: number;
}

function timedItems(agenda: PreviewAgendaItem[]): TimedItem[] {
  return agenda
    .map((item) => {
      const start = item.startTime ? minutesFromTime(item.startTime) : null;
      const end = item.endTime ? minutesFromTime(item.endTime) : null;
      if (start === null || end === null) return null;
      return { topic: item.topic, start, end };
    })
    .filter((item): item is TimedItem => item !== null)
    .sort((a, b) => a.start - b.start);
}

export function detectTimeConflicts(agenda: PreviewAgendaItem[]): ImportRowIssue[] {
  const issues: ImportRowIssue[] = [];
  const timed = timedItems(agenda);

  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      const a = timed[i];
      const b = timed[j];
      if (a.start < b.end && b.start < a.end) {
        issues.push({
          code: "agenda_overlap",
          message: `Agenda time overlap detected: "${a.topic}" and "${b.topic}"`,
        });
      }
    }
  }

  for (let i = 0; i < timed.length - 1; i += 1) {
    const current = timed[i];
    const next = timed[i + 1];
    if (next.start > current.end) {
      issues.push({
        code: "agenda_gap",
        message: `Gap between "${current.topic}" and "${next.topic}"`,
      });
    }
  }

  return issues;
}

export function detectDuplicateTopics(agenda: PreviewAgendaItem[]): ImportRowIssue[] {
  const seen = new Map<string, number>();
  const issues: ImportRowIssue[] = [];

  for (const item of agenda) {
    const key = item.topic.trim().toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 2) {
      issues.push({
        code: "duplicate_topic",
        message: `Duplicate topic inside meeting: "${item.topic}"`,
      });
    }
  }

  return issues;
}
