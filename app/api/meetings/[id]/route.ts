import { z } from "zod";
import { jsonError, requireAdmin, requireUser } from "@/lib/auth/session";
import { deleteMeeting, getMeetingDetail, updateMeeting } from "@/services/meetings";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  meetingLink: z.string().nullable().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const meeting = await getMeetingDetail(id, user.id);
    if (!meeting) {
      return Response.json({ error: "Meeting not found" }, { status: 404 });
    }
    return Response.json({ meeting });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const meeting = await updateMeeting(id, body);
    return Response.json({ meeting });
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
    await deleteMeeting(id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
