import { cookies, headers } from "next/headers";
import { ZodError } from "zod";
import { env, isDevelopment } from "@/lib/env";
import { validateInitData } from "@/lib/telegram/validate-init-data";
import { identifyTelegramUser, type TelegramProfile } from "@/services/auth";
import type { AppUser } from "@/types/domain";

const DEV_COOKIE = "dev_telegram_id";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function getTelegramProfile(): Promise<TelegramProfile> {
  const headerStore = await headers();
  const initData =
    headerStore.get("x-telegram-init-data") ||
    headerStore.get("authorization")?.replace(/^tma\s+/i, "") ||
    "";

  if (initData) {
    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new AuthError("TELEGRAM_BOT_TOKEN is not configured", 500);
    }
    const validated = validateInitData(initData, token);
    return {
      telegramId: validated.user.id,
      telegramUsername: validated.user.username ?? null,
      firstName: validated.user.first_name ?? null,
      lastName: validated.user.last_name ?? null,
    };
  }

  if (isDevelopment()) {
    const cookieStore = await cookies();
    const telegramId = cookieStore.get(DEV_COOKIE)?.value;
    if (telegramId) {
      const { getUserByTelegramId } = await import("@/services/auth");
      const user = await getUserByTelegramId(Number(telegramId));
      if (user) {
        return {
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      }
    }
  }

  throw new AuthError("No Telegram context");
}

export async function getSessionUser(options: { touchProfile?: boolean } = {}): Promise<AppUser | null> {
  const profile = await getTelegramProfile();
  return identifyTelegramUser(profile, options);
}

export async function getCurrentUser(): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Access required", 403);
  }
  return user;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (user.status !== "active") {
    throw new AuthError("Access pending approval", 403);
  }
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new AuthError("Admin access required", 403);
  }
  return user;
}

export function jsonError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: message }, { status: 500 });
}
