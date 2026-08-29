import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapParticipant } from "@/lib/mappers";
import type { AttendanceStatus, MeetingParticipant } from "@/types/domain";

export async function setAttendance(
  meetingId: string,
  userId: string,
  status: AttendanceStatus,
): Promise<MeetingParticipant> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from("meeting_participants")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase
      .from("meeting_participants")
      .update({ attendance_status: status })
      .eq("id", existing.id)
      .select("*, users(*)")
      .single();
    if (error) throw error;
    return mapParticipant(data);
  }

  const { data, error } = await supabase
    .from("meeting_participants")
    .insert({
      meeting_id: meetingId,
      user_id: userId,
      attendance_status: status,
    })
    .select("*, users(*)")
    .single();

  if (error) throw error;
  return mapParticipant(data);
}

export async function addParticipants(meetingId: string, userIds: string[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return;

  const { error } = await supabase.from("meeting_participants").upsert(
    unique.map((userId) => ({
      meeting_id: meetingId,
      user_id: userId,
    })),
    { onConflict: "meeting_id,user_id", ignoreDuplicates: true },
  );

  if (error) throw error;
}

export async function removeParticipant(meetingId: string, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("meeting_participants")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("user_id", userId);

  if (error) throw error;
}
