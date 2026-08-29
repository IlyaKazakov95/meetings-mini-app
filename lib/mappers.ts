import type {
  ActionItem,
  AgendaItem,
  AppUser,
  AttendanceCounts,
  AttendanceStatus,
  Decision,
  ImportRecord,
  Meeting,
  MeetingMinutes,
  MeetingParticipant,
} from "@/types/domain";
import type { ImportErrorLog, ImportPreview } from "@/types/import";

type DbUser = {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  role: AppUser["role"];
  status?: AppUser["status"] | null;
  created_at: string;
  updated_at: string;
};

type DbMeeting = {
  id: string;
  external_id: string;
  title: string;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  meeting_link: string | null;
  status: Meeting["status"];
  source: Meeting["source"];
  source_import_id: string | null;
  created_at: string;
  updated_at: string;
};

export function mapUser(row: DbUser): AppUser {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    telegramUsername: row.telegram_username,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    status: row.status === "pending" || row.status === "rejected" ? row.status : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTime(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

export function mapMeeting(row: DbMeeting): Meeting {
  return {
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    meetingDate: row.meeting_date,
    startTime: mapTime(row.start_time),
    endTime: mapTime(row.end_time),
    meetingLink: row.meeting_link,
    status: row.status,
    source: row.source,
    sourceImportId: row.source_import_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAgenda(row: {
  id: string;
  meeting_id: string;
  topic: string;
  start_time: string | null;
  end_time: string | null;
  responsible_text: string | null;
  outcome_expected: string | null;
  sort_order: number;
  source_row_number: number | null;
}): AgendaItem {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    topic: row.topic,
    startTime: mapTime(row.start_time),
    endTime: mapTime(row.end_time),
    responsibleText: row.responsible_text,
    outcomeExpected: row.outcome_expected,
    sortOrder: row.sort_order,
    sourceRowNumber: row.source_row_number,
  };
}

export function mapParticipant(row: {
  id: string;
  meeting_id: string;
  user_id: string;
  attendance_status: AttendanceStatus | null;
  users?: DbUser | DbUser[] | null;
}): MeetingParticipant {
  const userRow = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id,
    meetingId: row.meeting_id,
    userId: row.user_id,
    attendanceStatus: row.attendance_status,
    user: userRow ? mapUser(userRow) : undefined,
  };
}

export function mapMinutes(row: {
  id: string;
  meeting_id: string;
  summary: string | null;
  created_by: string | null;
}): MeetingMinutes {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    summary: row.summary,
    createdBy: row.created_by,
  };
}

export function mapDecision(row: {
  id: string;
  meeting_id: string;
  text: string;
  sort_order: number;
}): Decision {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    text: row.text,
    sortOrder: row.sort_order,
  };
}

export function mapAction(row: {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  due_date: string | null;
  status: ActionItem["status"];
  meetings?: { title?: string; meeting_date?: string } | { title?: string; meeting_date?: string }[] | null;
  users?: { display_name?: string | null; first_name?: string | null; last_name?: string | null } | null;
}): ActionItem {
  const meeting = Array.isArray(row.meetings) ? row.meetings[0] : row.meetings;
  return {
    id: row.id,
    meetingId: row.meeting_id,
    title: row.title,
    description: row.description,
    ownerId: row.owner_id,
    dueDate: row.due_date,
    status: row.status,
    meetingTitle: meeting?.title,
    meetingDate: meeting?.meeting_date,
    ownerName: row.users
      ? row.users.display_name || [row.users.first_name, row.users.last_name].filter(Boolean).join(" ")
      : null,
  };
}

export function mapImport(row: {
  id: string;
  filename: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: string;
  rows_total: number | null;
  meetings_created: number | null;
  meetings_updated: number | null;
  agenda_items_created: number | null;
  rows_failed: number | null;
  error_log: ImportErrorLog | null;
  preview_data: ImportPreview | null;
  users?: { display_name?: string | null; first_name?: string | null } | null;
}): ImportRecord {
  return {
    id: row.id,
    filename: row.filename,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.users?.display_name || row.users?.first_name || null,
    uploadedAt: row.uploaded_at,
    status: row.status,
    rowsTotal: row.rows_total,
    meetingsCreated: row.meetings_created,
    meetingsUpdated: row.meetings_updated,
    agendaItemsCreated: row.agenda_items_created,
    rowsFailed: row.rows_failed,
    errorLog: row.error_log,
    previewData: row.preview_data,
  };
}

export function emptyAttendance(): AttendanceCounts {
  return { going: 0, maybe: 0, notGoing: 0, noResponse: 0 };
}

export function countAttendance(
  participants: Array<{ attendanceStatus: AttendanceStatus | null }>,
): AttendanceCounts {
  return participants.reduce((counts, participant) => {
    if (participant.attendanceStatus === "going") counts.going += 1;
    else if (participant.attendanceStatus === "maybe") counts.maybe += 1;
    else if (participant.attendanceStatus === "not_going") counts.notGoing += 1;
    else counts.noResponse += 1;
    return counts;
  }, emptyAttendance());
}
