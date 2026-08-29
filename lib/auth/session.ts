import { cookies, headers } from "next/headers";
import { ZodError } from "zod";
import { env, isDevelopment } from "@/lib/env";
import { validateInitData } from "@/lib/telegram/validate-init-data";
import { upsertTelegramUser } from "@/services/auth";
import type { AppUser } from "@/types/domain";

const DEV_COOKIE = "dev_telegram_id";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

async function userFromInitData(initData: string): Promise<AppUser> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new AuthError("TELEGRAM_BOT_TOKEN is not configured", 500);
  }

  const validated = validateInitData(initData, token);
  const user = validated.user;
  return upsertTelegramUser({
    telegramId: user.id,
    telegramUsername: user.username ?? null,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
  });
}

export async function getCurrentUser(): Promise<AppUser> {
  const headerStore = await headers();
  const initData =
    headerStore.get("x-telegram-init-data") ||
    headerStore.get("authorization")?.replace(/^tma\s+/i, "") ||
    "";

  if (initData) {
    return userFromInitData(initData);
  }

  if (isDevelopment()) {
    const cookieStore = await cookies();
    const telegramId = cookieStore.get(DEV_COOKIE)?.value;
    if (telegramId) {
      const { getUserByTelegramId } = await import("@/services/auth");
      const user = await getUserByTelegramId(Number(telegramId));
      if (user) return user;
    }
  }

  throw new AuthError("No Telegram context");
}

export async function requireUser(): Promise<AppUser> {
  return getCurrentUser();
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await getCurrentUser();
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
