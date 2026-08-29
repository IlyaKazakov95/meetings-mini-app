import { jsonError, requireAdmin } from "@/lib/auth/session";
import { listUsers } from "@/services/auth";

export async function GET() {
  try {
    await requireAdmin();
    const users = await listUsers();
    return Response.json({ users });
  } catch (error) {
    return jsonError(error);
  }
}
