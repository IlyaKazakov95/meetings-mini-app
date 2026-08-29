import type { ImportRowIssue, ParsedExcelRow, ValidatedExcelRow } from "@/types/import";
import { normalizeDate } from "./normalize-date";
import { isEndBeforeOrEqualStart, normalizeTime } from "./normalize-time";

function isInvalidProvidedDate(row: ParsedExcelRow): boolean {
  const raw = row.raw.date;
  if (raw === null || raw === undefined || raw === "") return false;
  return normalizeDate(raw) === null;
}

function isInvalidProvidedTime(raw: unknown): boolean {
  if (raw === null || raw === undefined || raw === "") return false;
  return normalizeTime(raw) === null;
}

export function validateRows(rows: ParsedExcelRow[]): ValidatedExcelRow[] {
  return rows.map((row) => {
    const errors: ImportRowIssue[] = [];
    const warnings: ImportRowIssue[] = [];

    if (!row.date) {
      errors.push({
        code: "missing_date",
        message: "Date is missing after forward-fill",
      });
    } else if (isInvalidProvidedDate(row)) {
      errors.push({ code: "invalid_date", message: "Invalid Date" });
    }

    if (!row.meeting) {
      errors.push({ code: "missing_meeting", message: "Meeting is missing" });
    }

    if (!row.topic) {
      errors.push({ code: "missing_topic", message: "Topic is missing" });
    }

    if (isInvalidProvidedTime(row.raw.startTime)) {
      errors.push({ code: "invalid_start_time", message: "Invalid Start_Time" });
    }

    if (isInvalidProvidedTime(row.raw.endTime)) {
      errors.push({ code: "invalid_end_time", message: "Invalid End_Time" });
    }

    if (isEndBeforeOrEqualStart(row.startTime, row.endTime)) {
      errors.push({
        code: "end_before_start",
        message: "End_Time must be after Start_Time",
      });
    }

    if (!row.who) {
      warnings.push({ code: "empty_who", message: "Who is empty" });
    }

    if (!row.outcomeExpected) {
      warnings.push({
        code: "empty_outcome",
        message: "Outcome_expected is empty",
      });
    }

    if (!row.meetingLink) {
      warnings.push({
        code: "empty_meeting_link",
        message: "Meeting_Link is empty",
      });
    }

    return {
      sourceRowNumber: row.sourceRowNumber,
      date: row.date,
      meeting: row.meeting,
      topic: row.topic,
      startTime: row.startTime,
      endTime: row.endTime,
      who: row.who,
      outcomeExpected: row.outcomeExpected,
      meetingLink: row.meetingLink,
      errors,
      warnings,
    };
  });
}
