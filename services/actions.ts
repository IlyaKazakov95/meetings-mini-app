import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapAction } from "@/lib/mappers";
import { sanitizeText } from "@/lib/utils";
import { notifications } from "@/services/notifications";
import type { ActionItem, ActionStatus } from "@/types/domain";

export async function createAction(input: {
  meetingId: string;
  title: string;
  description?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
}): Promise<ActionItem> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("action_items")
    .insert({
      meeting_id: input.meetingId,
      title: sanitizeText(input.title, 300),
      description: input.description ? sanitizeText(input.description, 2000) : null,
      owner_id: input.ownerId || null,
      due_date: input.dueDate || null,
      status: "open",
    })
    .select("*, meetings(title, meeting_date), users(display_name, first_name, last_name)")
    .single();

  if (error) throw error;

  if (input.ownerId) {
    await notifications.enqueue({
      event: "action_assigned",
      userIds: [input.ownerId],
      title: "New action assigned",
      body: sanitizeText(input.title, 120),
    });
  }

  return mapAction(data);
}

export async function updateAction(
  id: string,
  input: Partial<{
    title: string;
    description: string | null;
    ownerId: string | null;
    dueDate: string | null;
    status: ActionStatus;
  }>,
  actorId: string,
  actorRole: "user" | "admin",
): Promise<ActionItem> {
  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase
    .from("action_items")
    .select("*")
    .eq("id", id)
    .single();

  if (currentError) throw currentError;

  if (actorRole !== "admin" && current.owner_id !== actorId) {
    throw new Error("You can only update your own actions");
  }

  const payload: Record<string, unknown> = {};
  if (input.status !== undefined) payload.status = input.status;

  if (actorRole === "admin") {
    if (input.title !== undefined) payload.title = sanitizeText(input.title, 300);
    if (input.description !== undefined) payload.description = input.description;
    if (input.ownerId !== undefined) payload.owner_id = input.ownerId;
    if (input.dueDate !== undefined) payload.due_date = input.dueDate;
  }

  const { data, error } = await supabase
    .from("action_items")
    .update(payload)
    .eq("id", id)
    .select("*, meetings(title, meeting_date), users(display_name, first_name, last_name)")
    .single();

  if (error) throw error;
  return mapAction(data);
}

export async function listMyActions(userId: string): Promise<ActionItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("action_items")
    .select("*, meetings(title, meeting_date), users(display_name, first_name, last_name)")
    .eq("owner_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []).map(mapAction);
}
