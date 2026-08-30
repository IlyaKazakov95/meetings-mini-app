import { getTelegramProfile, jsonError } from "@/lib/auth/session";
import { identifyTelegramUser } from "@/services/auth";

export async function GET() {
  try {
    const profile = await getTelegramProfile();
    const user = await identifyTelegramUser(profile, { touchProfile: true });
    return Response.json({
      user,
      profile,
      canRequest: !user,
    });
  } catch (error) {
    return jsonError(error);
  }
}
