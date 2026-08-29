import type {
  ExistingMeetingSnapshot,
  ImportPreview,
  ImportRowIssue,
  ParsedExcelRow,
  PreviewMeeting,
} from "@/types/import";
import { validateRows } from "./validate-rows";
import { groupRowsIntoMeetings } from "./group-meetings";
import { detectDuplicateTopics, detectTimeConflicts } from "./time-conflicts";

function sameText(a: string | null, b: string | null): boolean {
  return (a ?? "") === (b ?? "");
}

function agendaEquals(
  next: PreviewMeeting["agenda"],
  current: ExistingMeetingSnapshot["agenda"],
): boolean {
  if (next.length !== current.length) return false;

  return next.every((item, index) => {
    const existing = current[index];
    return (
      item.topic === existing.topic &&
      sameText(item.startTime, existing.startTime) &&
      sameText(item.endTime, existing.endTime) &&
      sameText(item.responsibleText, existing.responsibleText) &&
      sameText(item.outcomeExpected, existing.outcomeExpected)
    );
  });
}

function meetingEquals(next: PreviewMeeting, current: ExistingMeetingSnapshot): boolean {
  return (
    next.title === current.title &&
    next.meetingDate === current.meetingDate &&
    sameText(next.startTime, current.startTime) &&
    sameText(next.endTime, current.endTime) &&
    sameText(next.meetingLink, current.meetingLink) &&
    agendaEquals(next.agenda, current.agenda)
  );
}

export function buildImportPreview(
  rows: ParsedExcelRow[],
  existing: ExistingMeetingSnapshot[] = [],
): ImportPreview {
  const validated = validateRows(rows);
  const existingById = new Map(existing.map((item) => [item.externalId, item]));

  const rowErrors = validated.flatMap((row) =>
    row.errors.map((issue) => ({
      ...issue,
      rowNumber: row.sourceRowNumber,
    })),
  );
  const rowWarnings = validated.flatMap((row) =>
    row.warnings.map((issue) => ({
      ...issue,
      rowNumber: row.sourceRowNumber,
    })),
  );

  const groups = groupRowsIntoMeetings(validated);
  const meetings: PreviewMeeting[] = [];
  const groupWarnings: Array<ImportRowIssue & { meetingKey?: string; rowNumber?: number }> = [];

  for (const group of groups) {
    const warnings: ImportRowIssue[] = [];

    if (group.linkValues.length > 1) {
      warnings.push({
        code: "conflicting_meeting_links",
        message: "Multiple different Meeting_Link values inside one meeting",
      });
    }

    warnings.push(...detectTimeConflicts(group.agenda));
    warnings.push(...detectDuplicateTopics(group.agenda));

    const current = existingById.get(group.externalId);
    const draft: PreviewMeeting = {
      externalId: group.externalId,
      title: group.title,
      meetingDate: group.meetingDate,
      startTime: group.startTime,
      endTime: group.endTime,
      meetingLink: group.meetingLink,
      operation: current ? "update" : "create",
      topicCount: group.agenda.length,
      agenda: group.agenda,
      warnings,
    };

    if (current && meetingEquals(draft, current)) {
      draft.operation = "unchanged";
    }

    meetings.push(draft);
    groupWarnings.push(
      ...warnings.map((warning) => ({
        ...warning,
        meetingKey: group.externalId,
      })),
    );
  }

  const errors = rowErrors;
  const warnings = [...rowWarnings, ...groupWarnings];
  const rowsFailed = validated.filter((row) => row.errors.length > 0).length;

  return {
    meetings,
    meetingsFound: meetings.length,
    agendaTopics: meetings.reduce((sum, meeting) => sum + meeting.topicCount, 0),
    newMeetings: meetings.filter((meeting) => meeting.operation === "create").length,
    updatedMeetings: meetings.filter((meeting) => meeting.operation === "update").length,
    unchangedMeetings: meetings.filter((meeting) => meeting.operation === "unchanged").length,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    rowsTotal: rows.length,
    rowsFailed,
    canImport: errors.length === 0 && meetings.length > 0,
  };
}
