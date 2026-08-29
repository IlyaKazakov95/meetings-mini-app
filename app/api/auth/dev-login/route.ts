import { cookies } from "next/headers";
import { isDevelopment } from "@/lib/env";
import { getUserByTelegramId } from "@/services/auth";

export async function POST(request: Request) {
  if (!isDevelopment()) {
    return Response.json({ error: "Development login is disabled" }, { status: 403 });
  }

  const body = (await request.json()) as { telegramId?: number };
  if (!body.telegramId) {
    return Response.json({ error: "telegramId is required" }, { status: 400 });
  }

  const user = await getUserByTelegramId(body.telegramId);
  if (!user) {
    return Response.json({ error: "Demo user not found. Run npm run seed." }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set("dev_telegram_id", String(body.telegramId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return Response.json({ user });
}
