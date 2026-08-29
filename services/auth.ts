import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapUser } from "@/lib/mappers";
import type { AppUser, UserStatus } from "@/types/domain";

export interface TelegramProfile {
  telegramId: number;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
}

function displayNameFrom(input: TelegramProfile): string | null {
  return [input.firstName, input.lastName].filter(Boolean).join(" ") || null;
}

async function countActiveAdmins(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active");
  if (error) throw error;
  return count ?? 0;
}

export async function createUser(
  input: TelegramProfile,
  role: AppUser["role"],
  status: UserStatus,
): Promise<AppUser> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .insert({
      telegram_id: input.telegramId,
      telegram_username: input.telegramUsername,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: displayNameFrom(input),
      role,
      status,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapUser(data);
}

export async function refreshProfile(userId: string, input: TelegramProfile): Promise<AppUser> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (existingError) throw existingError;

  const { data, error } = await supabase
    .from("users")
    .update({
      telegram_username: input.telegramUsername,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: existing.display_name || displayNameFrom(input),
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return mapUser(data);
}

export async function identifyTelegramUser(input: TelegramProfile): Promise<AppUser | null> {
  const existing = await getUserByTelegramId(input.telegramId);
  if (existing) {
    return refreshProfile(existing.id, input);
  }

  if ((await countActiveAdmins()) === 0) {
    return createUser(input, "admin", "active");
  }

  return null;
}

export async function requestAccess(input: TelegramProfile): Promise<AppUser> {
  const existing = await getUserByTelegramId(input.telegramId);
  if (existing) {
    if (existing.status === "active") {
      return refreshProfile(existing.id, input);
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .update({
        status: "pending",
        telegram_username: input.telegramUsername,
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: existing.displayName || displayNameFrom(input),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return mapUser(data);
  }

  if ((await countActiveAdmins()) === 0) {
    return createUser(input, "admin", "active");
  }

  return createUser(input, "user", "pending");
}

export async function setAccessStatus(userId: string, status: "active" | "rejected"): Promise<AppUser> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .update({ status })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return mapUser(data);
}

export async function upsertTelegramUser(input: TelegramProfile): Promise<AppUser> {
  const identified = await identifyTelegramUser(input);
  if (identified) return identified;
  return requestAccess(input);
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

export async function listUsers(status?: UserStatus): Promise<AppUser[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("users").select("*").order("created_at", { ascending: false });
  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
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

export async function deleteUser(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: target, error: targetError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) throw targetError;
  if (!target) {
    throw new Error("User not found");
  }

  if (target.role === "admin" && target.status === "active") {
    const { count, error: countError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active");
    if (countError) throw countError;
    if ((count ?? 0) <= 1) {
      throw new Error("Cannot delete the last admin");
    }
  }

  const { error } = await supabase.from("users").delete().eq("id", userId);
  if (error) throw error;
}

export async function listDemoUsers(): Promise<AppUser[]> {
  return listUsers();
}
