import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { upsertMinutes } from "@/services/minutes";

const schema = z.object({
  summary: z.string().max(8000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const minutes = await upsertMinutes(id, user.id, body.summary);
    return Response.json({ minutes });
  } catch (error) {
    return jsonError(error);
  }
}
