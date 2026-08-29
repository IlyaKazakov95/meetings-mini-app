import { jsonError, requireAdmin } from "@/lib/auth/session";
import { deleteDecision } from "@/services/minutes";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    await deleteDecision(id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
