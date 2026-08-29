import { addDays, formatISO, parseISO } from "date-fns";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  countAttendance,
  emptyAttendance,
  mapAction,
  mapAgenda,
  mapDecision,
  mapMeeting,
  mapMinutes,
  mapParticipant,
} from "@/lib/mappers";
import { buildMeetingExternalId } from "@/features/imports/excel";
import { sanitizeText } from "@/lib/utils";
import type {
  HomeCounters,
  Meeting,
  MeetingDetail,
  MeetingListItem,
  MeetingStatus,
} from "@/types/domain";

function weekRange(weekStart: string): { from: string; to: string } {
  const start = parseISO(weekStart);
  return {
    from: formatISO(start, { representation: "date" }),
    to: formatISO(addDays(start, 6), { representation: "date" }),
  };
}

export async function listMeetingsForWeek(
  weekStart: string,
  userId: string,
): Promise<MeetingListItem[]> {
  const supabase = getSupabaseAdmin();
  const { from, to } = weekRange(weekStart);

  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("*")
    .gte("meeting_date", from)
    .lte("meeting_date", to)
    .neq("status", "cancelled")
    .order("meeting_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;
  if (!meetings?.length) return [];

  const ids = meetings.map((meeting) => meeting.id);

  const [{ data: agenda }, { data: participants }] = await Promise.all([
    supabase.from("agenda_items").select("id, meeting_id").in("meeting_id", ids),
    supabase
      .from("meeting_participants")
      .select("meeting_id, user_id, attendance_status")
      .in("meeting_id", ids),
  ]);

  return meetings.map((row) => {
    const mapped = mapMeeting(row);
    const meetingParticipants = (participants ?? []).filter((item) => item.meeting_id === row.id);
    const mine = meetingParticipants.find((item) => item.user_id === userId);

    return {
      ...mapped,
      topicCount: (agenda ?? []).filter((item) => item.meeting_id === row.id).length,
      attendance: countAttendance(
        meetingParticipants.map((item) => ({ attendanceStatus: item.attendance_status })),
      ),
      myAttendance: mine?.attendance_status ?? null,
    };
  });
}

export async function getHomeCounters(userId: string, today: string): Promise<HomeCounters> {
  const supabase = getSupabaseAdmin();

  const [{ count: meetingsToday }, { data: myAttendance }, { data: myActions }] = await Promise.all([
    supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .eq("meeting_date", today)
      .neq("status", "cancelled"),
    supabase
      .from("meeting_participants")
      .select("meeting_id, attendance_status, meetings!inner(meeting_date, status)")
      .eq("user_id", userId)
      .eq("meetings.meeting_date", today)
      .neq("meetings.status", "cancelled"),
    supabase
      .from("action_items")
      .select("id, due_date, status")
      .eq("owner_id", userId)
      .in("status", ["open", "in_progress"]),
  ]);

  const { count: todayMeetingsForResponse } = await supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("meeting_date", today)
    .neq("status", "cancelled");

  const responded = new Set(
    (myAttendance ?? [])
      .filter((item) => item.attendance_status)
      .map((item) => item.meeting_id),
  );

  const needResponse = Math.max((todayMeetingsForResponse ?? 0) - responded.size, 0);
  const openActions = myActions?.length ?? 0;
  const overdue = (myActions ?? []).filter((item) => item.due_date && item.due_date < today).length;

  return {
    meetingsToday: meetingsToday ?? 0,
    needResponse,
    openActions,
    overdue,
  };
}

export async function getMeetingDetail(id: string, userId: string): Promise<MeetingDetail | null> {
  const supabase = getSupabaseAdmin();
  const { data: meeting, error } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!meeting) return null;

  const [agenda, participants, minutes, decisions, actions] = await Promise.all([
    supabase.from("agenda_items").select("*").eq("meeting_id", id).order("sort_order"),
    supabase
      .from("meeting_participants")
      .select("*, users(*)")
      .eq("meeting_id", id)
      .order("created_at"),
    supabase.from("meeting_minutes").select("*").eq("meeting_id", id).maybeSingle(),
    supabase.from("decisions").select("*").eq("meeting_id", id).order("sort_order"),
    supabase.from("action_items").select("*, users(display_name, first_name, last_name)").eq("meeting_id", id).order("created_at"),
  ]);

  if (agenda.error) throw agenda.error;
  if (participants.error) throw participants.error;
  if (minutes.error) throw minutes.error;
  if (decisions.error) throw decisions.error;
  if (actions.error) throw actions.error;

  const mappedParticipants = (participants.data ?? []).map(mapParticipant);
  const mine = mappedParticipants.find((item) => item.userId === userId);

  return {
    ...mapMeeting(meeting),
    agenda: (agenda.data ?? []).map(mapAgenda),
    participants: mappedParticipants,
    attendance: countAttendance(mappedParticipants),
    myAttendance: mine?.attendanceStatus ?? null,
    minutes: minutes.data ? mapMinutes(minutes.data) : null,
    decisions: (decisions.data ?? []).map(mapDecision),
    actionItems: (actions.data ?? []).map(mapAction),
  };
}

export async function createMeeting(input: {
  title: string;
  meetingDate: string;
  startTime?: string | null;
  endTime?: string | null;
  meetingLink?: string | null;
}): Promise<Meeting> {
  const supabase = getSupabaseAdmin();
  const title = sanitizeText(input.title, 200);
  const externalId = `${buildMeetingExternalId(input.meetingDate, title)}__manual_${Date.now()}`;

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      external_id: externalId,
      title,
      meeting_date: input.meetingDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      meeting_link: input.meetingLink || null,
      source: "manual",
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapMeeting(data);
}

export async function updateMeeting(
  id: string,
  input: Partial<{
    title: string;
    meetingDate: string;
    startTime: string | null;
    endTime: string | null;
    meetingLink: string | null;
    status: MeetingStatus;
  }>,
): Promise<Meeting> {
  const supabase = getSupabaseAdmin();
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = sanitizeText(input.title, 200);
  if (input.meetingDate !== undefined) payload.meeting_date = input.meetingDate;
  if (input.startTime !== undefined) payload.start_time = input.startTime;
  if (input.endTime !== undefined) payload.end_time = input.endTime;
  if (input.meetingLink !== undefined) payload.meeting_link = input.meetingLink;
  if (input.status !== undefined) payload.status = input.status;

  const { data, error } = await supabase.from("meetings").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return mapMeeting(data);
}

export async function deleteMeeting(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

export function emptyMeetingAttendance() {
  return emptyAttendance();
}
