import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { updateUserRole } from "@/services/auth";

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
