import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const telegramUserSchema = z.object({
  id: z.number(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.boolean().optional(),
  photo_url: z.string().optional(),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;

export interface ValidatedInitData {
  user: TelegramUser;
  authDate: number;
  queryId?: string;
}

const MAX_AGE_SECONDS = 24 * 60 * 60;

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function validateInitData(initData: string, botToken: string): ValidatedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("initData is missing hash");
  }

  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!hashesEqual(computed, hash)) {
    throw new Error("Invalid Telegram initData signature");
  }

  const authDate = Number(params.get("auth_date") ?? "0");
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SECONDS) {
    throw new Error("Telegram initData has expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("initData is missing user");
  }

  const user = telegramUserSchema.parse(JSON.parse(userRaw));

  return {
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined,
  };
}
