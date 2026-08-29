export interface NormalizedExcelRow {
  sourceRowNumber: number;
  date: string | null;
  meeting: string | null;
  topic: string | null;
  startTime: string | null;
  endTime: string | null;
  who: string | null;
  outcomeExpected: string | null;
  meetingLink: string | null;
  raw: Record<string, unknown>;
}

export interface ParsedExcelRow extends NormalizedExcelRow {
  date: string | null;
  meeting: string | null;
}

export interface ValidatedExcelRow {
  sourceRowNumber: number;
  date: string | null;
  meeting: string | null;
  topic: string | null;
  startTime: string | null;
  endTime: string | null;
  who: string | null;
  outcomeExpected: string | null;
  meetingLink: string | null;
  errors: ImportRowIssue[];
  warnings: ImportRowIssue[];
}

export interface ImportRowIssue {
  code: string;
  message: string;
}

export interface PreviewAgendaItem {
  topic: string;
  startTime: string | null;
  endTime: string | null;
  responsibleText: string | null;
  outcomeExpected: string | null;
  sourceRowNumber: number;
  sortOrder: number;
}

export interface PreviewMeeting {
  externalId: string;
  title: string;
  meetingDate: string;
  startTime: string | null;
  endTime: string | null;
  meetingLink: string | null;
  operation: "create" | "update" | "unchanged";
  topicCount: number;
  agenda: PreviewAgendaItem[];
  warnings: ImportRowIssue[];
}

export interface ImportPreview {
  meetings: PreviewMeeting[];
  meetingsFound: number;
  agendaTopics: number;
  newMeetings: number;
  updatedMeetings: number;
  unchangedMeetings: number;
  errorCount: number;
  warningCount: number;
  errors: Array<ImportRowIssue & { rowNumber?: number; meetingKey?: string }>;
  warnings: Array<ImportRowIssue & { rowNumber?: number; meetingKey?: string }>;
  rowsTotal: number;
  rowsFailed: number;
  canImport: boolean;
}

export interface ExistingMeetingSnapshot {
  externalId: string;
  title: string;
  meetingDate: string;
  startTime: string | null;
  endTime: string | null;
  meetingLink: string | null;
  agenda: Array<{
    topic: string;
    startTime: string | null;
    endTime: string | null;
    responsibleText: string | null;
    outcomeExpected: string | null;
    sortOrder: number;
  }>;
}

export interface SyncResult {
  meetingsCreated: number;
  meetingsUpdated: number;
  meetingsUnchanged: number;
  agendaItemsCreated: number;
  warnings: number;
  errors: number;
}

export type HeaderField =
  | "date"
  | "meeting"
  | "topic"
  | "startTime"
  | "endTime"
  | "who"
  | "outcomeExpected"
  | "meetingLink";
