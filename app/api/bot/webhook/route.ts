import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { env } from "@/lib/env";

export const runtime = "nodejs";

function createBot() {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const bot = new Bot(token);
  const appUrl = env.APP_URL || "https://example.com";

  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp("Open Meetings", appUrl);
    await ctx.reply("Team meetings, attendance, minutes and follow-up — inside Telegram.", {
      reply_markup: keyboard,
    });
  });

  return bot;
}

export async function POST(request: Request) {
  try {
    const bot = createBot();
    const handle = webhookCallback(bot, "std/http");
    return handle(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bot error";
    return Response.json({ error: message }, { status: 500 });
  }
}
