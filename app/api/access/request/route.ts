import { getTelegramProfile, jsonError } from "@/lib/auth/session";
import { requestAccess } from "@/services/auth";

export async function POST() {
  try {
    const profile = await getTelegramProfile();
    const user = await requestAccess(profile);
    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
