import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapDecision, mapMinutes } from "@/lib/mappers";
import { sanitizeText } from "@/lib/utils";
import { notifications } from "@/services/notifications";
import type { Decision, MeetingMinutes } from "@/types/domain";

export async function upsertMinutes(
  meetingId: string,
  userId: string,
  summary: string,
): Promise<MeetingMinutes> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("meeting_minutes")
    .select("*")
    .eq("meeting_id", meetingId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("meeting_minutes")
      .update({ summary: sanitizeText(summary, 8000) })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapMinutes(data);
  }

  const { data, error } = await supabase
    .from("meeting_minutes")
    .insert({
      meeting_id: meetingId,
      summary: sanitizeText(summary, 8000),
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  await notifications.enqueue({
    event: "minutes_available",
    userIds: [],
    title: "Meeting minutes available",
    body: "Minutes were added to a meeting",
  });

  return mapMinutes(data);
}

export async function addDecision(meetingId: string, text: string): Promise<Decision> {
  const supabase = getSupabaseAdmin();
  const { data: last } = await supabase
    .from("decisions")
    .select("sort_order")
    .eq("meeting_id", meetingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("decisions")
    .insert({
      meeting_id: meetingId,
      text: sanitizeText(text, 2000),
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapDecision(data);
}

export async function deleteDecision(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("decisions").delete().eq("id", id);
  if (error) throw error;
}
