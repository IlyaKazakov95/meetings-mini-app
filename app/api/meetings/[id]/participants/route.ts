import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { addParticipants, removeParticipant } from "@/services/attendance";
import { listUsers } from "@/services/auth";

const schema = z.object({
  userIds: z.array(z.string().uuid()).optional(),
  addAll: z.boolean().optional(),
  removeUserId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = schema.parse(await request.json());

    if (body.removeUserId) {
      await removeParticipant(id, body.removeUserId);
      return Response.json({ ok: true });
    }

    if (body.addAll) {
      const users = await listUsers();
      await addParticipants(id, users.map((user) => user.id));
      return Response.json({ ok: true });
    }

    await addParticipants(id, body.userIds ?? []);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
