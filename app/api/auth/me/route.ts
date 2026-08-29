import { jsonError, getSessionUser, getTelegramProfile } from "@/lib/auth/session";

export async function GET() {
  try {
    const profile = await getTelegramProfile();
    const user = await getSessionUser();
    return Response.json({
      user,
      profile,
      canRequest: !user,
    });
  } catch (error) {
    return jsonError(error);
  }
}
