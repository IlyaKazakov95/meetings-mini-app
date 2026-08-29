export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const MEETING_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const MEETING_SOURCES = ["manual", "xlsx"] as const;
export type MeetingSource = (typeof MEETING_SOURCES)[number];

export const ATTENDANCE_STATUSES = ["going", "not_going", "maybe"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ACTION_STATUSES = ["open", "in_progress", "done", "cancelled"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const IMPORT_STATUSES = [
  "pending",
  "preview",
  "completed",
  "failed",
  "validation_failed",
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export interface AppUser {
  id: string;
  telegramId: number;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  externalId: string;
  title: string;
  meetingDate: string;
  startTime: string | null;
  endTime: string | null;
  meetingLink: string | null;
  status: MeetingStatus;
  source: MeetingSource;
  sourceImportId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaItem {
  id: string;
  meetingId: string;
  topic: string;
  startTime: string | null;
  endTime: string | null;
  responsibleText: string | null;
  outcomeExpected: string | null;
  sortOrder: number;
  sourceRowNumber: number | null;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  attendanceStatus: AttendanceStatus | null;
  user?: AppUser;
}

export interface AttendanceCounts {
  going: number;
  maybe: number;
  notGoing: number;
  noResponse: number;
}

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  summary: string | null;
  createdBy: string | null;
}

export interface Decision {
  id: string;
  meetingId: string;
  text: string;
  sortOrder: number;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  dueDate: string | null;
  status: ActionStatus;
  meetingTitle?: string;
  meetingDate?: string;
  ownerName?: string | null;
}

export interface ImportRecord {
  id: string;
  filename: string | null;
  uploadedBy: string | null;
  uploadedByName?: string | null;
  uploadedAt: string;
  status: string;
  rowsTotal: number | null;
  meetingsCreated: number | null;
  meetingsUpdated: number | null;
  agendaItemsCreated: number | null;
  rowsFailed: number | null;
  errorLog: ImportErrorLog | null;
  previewData: ImportPreview | null;
}

export interface ImportIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  rowNumber?: number;
  meetingKey?: string;
}

export interface ImportErrorLog {
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

export interface HomeCounters {
  meetingsToday: number;
  needResponse: number;
  openActions: number;
  overdue: number;
}

export interface MeetingListItem extends Meeting {
  topicCount: number;
  attendance: AttendanceCounts;
  myAttendance: AttendanceStatus | null;
}

export interface MeetingDetail extends Meeting {
  agenda: AgendaItem[];
  participants: MeetingParticipant[];
  attendance: AttendanceCounts;
  myAttendance: AttendanceStatus | null;
  minutes: MeetingMinutes | null;
  decisions: Decision[];
  actionItems: ActionItem[];
}
