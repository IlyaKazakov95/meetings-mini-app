import { z } from "zod";
import { jsonError, requireAdmin, requireUser } from "@/lib/auth/session";
import { createMeeting, listMeetingsForWeek } from "@/services/meetings";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  meetingLink: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const weekStart = url.searchParams.get("weekStart");
    if (!weekStart) {
      return Response.json({ error: "weekStart is required" }, { status: 400 });
    }
    const meetings = await listMeetingsForWeek(weekStart, user.id);
    return Response.json({ meetings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await request.json());
    const meeting = await createMeeting(body);
    return Response.json({ meeting });
  } catch (error) {
    return jsonError(error);
  }
}
