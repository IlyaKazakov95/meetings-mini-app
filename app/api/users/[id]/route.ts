import { z } from "zod";
import { AuthError, jsonError, requireAdmin } from "@/lib/auth/session";
import { deleteUser, updateUserRole } from "@/services/auth";

const schema = z.object({
  role: z.enum(["user", "admin"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const user = await updateUserRole(id, body.role);
    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (id === admin.id) {
      throw new AuthError("You cannot delete yourself", 400);
    }
    await deleteUser(id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && /last admin|not found/i.test(error.message)) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
