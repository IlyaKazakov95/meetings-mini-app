import { jsonError, requireUser } from "@/lib/auth/session";
import { listMyActions } from "@/services/actions";

export async function GET() {
  try {
    const user = await requireUser();
    const actions = await listMyActions(user.id);
    return Response.json({ actions });
  } catch (error) {
    return jsonError(error);
  }
}
