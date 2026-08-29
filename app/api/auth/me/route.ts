import { jsonError, requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
