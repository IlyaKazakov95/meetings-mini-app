import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { setAccessStatus } from "@/services/auth";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const user = await setAccessStatus(id, body.action === "approve" ? "active" : "rejected");
    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
