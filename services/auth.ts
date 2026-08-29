import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapUser } from "@/lib/mappers";
import type { AppUser } from "@/types/domain";

export async function upsertTelegramUser(input: {
  telegramId: number;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
}): Promise<AppUser> {
  const supabase = getSupabaseAdmin();
  const displayName = [input.firstName, input.lastName].filter(Boolean).join(" ") || null;

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", input.telegramId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase
      .from("users")
      .update({
        telegram_username: input.telegramUsername,
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: existing.display_name || displayName,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return mapUser(data);
  }

  const { count } = await supabase.from("users").select("id", { count: "exact", head: true });
  const role = (count ?? 0) === 0 ? "admin" : "user";

  const { data, error } = await supabase
    .from("users")
    .insert({
      telegram_id: input.telegramId,
      telegram_username: input.telegramUsername,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: displayName,
      role,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapUser(data);
}

export async function getUserByTelegramId(telegramId: number): Promise<AppUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapUser(data) : null;
}

export async function listUsers(): Promise<AppUser[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapUser);
}

export async function updateUserRole(userId: string, role: AppUser["role"]): Promise<AppUser> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return mapUser(data);
}

export async function listDemoUsers(): Promise<AppUser[]> {
  return listUsers();
}
