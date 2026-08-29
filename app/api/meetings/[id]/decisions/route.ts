import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { addDecision } from "@/services/minutes";

const schema = z.object({
  text: z.string().min(1).max(2000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const decision = await addDecision(id, body.text);
    return Response.json({ decision });
  } catch (error) {
    return jsonError(error);
  }
}
