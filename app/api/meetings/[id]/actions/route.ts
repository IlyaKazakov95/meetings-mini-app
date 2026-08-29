import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { createAction } from "@/services/actions";

const schema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const action = await createAction({ meetingId: id, ...body });
    return Response.json({ action });
  } catch (error) {
    return jsonError(error);
  }
}
