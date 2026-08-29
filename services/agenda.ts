import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapAgenda } from "@/lib/mappers";
import { sanitizeText } from "@/lib/utils";
import type { AgendaItem } from "@/types/domain";

export async function listAgenda(meetingId: string): Promise<AgendaItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agenda_items")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("sort_order");

  if (error) throw error;
  return (data ?? []).map(mapAgenda);
}

export async function createAgendaItem(
  meetingId: string,
  input: {
    topic: string;
    startTime?: string | null;
    endTime?: string | null;
    responsibleText?: string | null;
    outcomeExpected?: string | null;
  },
): Promise<AgendaItem> {
  const supabase = getSupabaseAdmin();
  const { data: last } = await supabase
    .from("agenda_items")
    .select("sort_order")
    .eq("meeting_id", meetingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("agenda_items")
    .insert({
      meeting_id: meetingId,
      topic: sanitizeText(input.topic, 500),
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      responsible_text: input.responsibleText ? sanitizeText(input.responsibleText, 500) : null,
      outcome_expected: input.outcomeExpected ? sanitizeText(input.outcomeExpected, 4000) : null,
      sort_order: (last?.sort_order ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error) throw error;
  await refreshMeetingTimes(meetingId);
  return mapAgenda(data);
}

export async function createAgendaFromLines(meetingId: string, text: string): Promise<AgendaItem[]> {
  const topics = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const created: AgendaItem[] = [];
  for (const topic of topics) {
    created.push(await createAgendaItem(meetingId, { topic }));
  }
  return created;
}

export async function updateAgendaItem(
  id: string,
  input: Partial<{
    topic: string;
    startTime: string | null;
    endTime: string | null;
    responsibleText: string | null;
    outcomeExpected: string | null;
    sortOrder: number;
  }>,
): Promise<AgendaItem> {
  const supabase = getSupabaseAdmin();
  const payload: Record<string, unknown> = {};
  if (input.topic !== undefined) payload.topic = sanitizeText(input.topic, 500);
  if (input.startTime !== undefined) payload.start_time = input.startTime;
  if (input.endTime !== undefined) payload.end_time = input.endTime;
  if (input.responsibleText !== undefined) {
    payload.responsible_text = input.responsibleText ? sanitizeText(input.responsibleText, 500) : null;
  }
  if (input.outcomeExpected !== undefined) {
    payload.outcome_expected = input.outcomeExpected ? sanitizeText(input.outcomeExpected, 4000) : null;
  }
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;

  const { data, error } = await supabase.from("agenda_items").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  await refreshMeetingTimes(data.meeting_id);
  return mapAgenda(data);
}

export async function deleteAgendaItem(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("agenda_items").delete().eq("id", id).select("meeting_id").single();
  if (error) throw error;
  if (data?.meeting_id) await refreshMeetingTimes(data.meeting_id);
}

export async function reorderAgenda(meetingId: string, orderedIds: string[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("agenda_items").update({ sort_order: index }).eq("id", id).eq("meeting_id", meetingId),
    ),
  );
}

async function refreshMeetingTimes(meetingId: string): Promise<void> {
  const items = await listAgenda(meetingId);
  const starts = items.map((item) => item.startTime).filter((item): item is string => Boolean(item));
  const ends = items.map((item) => item.endTime).filter((item): item is string => Boolean(item));

  const supabase = getSupabaseAdmin();
  await supabase
    .from("meetings")
    .update({
      start_time: starts.sort()[0] ?? null,
      end_time: ends.sort().at(-1) ?? null,
    })
    .eq("id", meetingId);
}
