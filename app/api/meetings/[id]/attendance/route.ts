import { z } from "zod";
import { jsonError, requireUser } from "@/lib/auth/session";
import { setAttendance } from "@/services/attendance";

const schema = z.object({
  status: z.enum(["going", "not_going", "maybe"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const participant = await setAttendance(id, user.id, body.status);
    return Response.json({ participant });
  } catch (error) {
    return jsonError(error);
  }
}
