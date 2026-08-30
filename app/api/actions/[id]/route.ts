import { z } from "zod";
import { jsonError, requireAdmin, requireUser } from "@/lib/auth/session";
import { deleteAction, updateAction } from "@/services/actions";

const schema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["open", "in_progress", "done", "cancelled"]).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const action = await updateAction(id, body, user.id, user.role);
    return Response.json({ action });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    await deleteAction(id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
