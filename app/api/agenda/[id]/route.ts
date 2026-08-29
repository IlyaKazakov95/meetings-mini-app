import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { deleteAgendaItem, updateAgendaItem } from "@/services/agenda";

const schema = z.object({
  topic: z.string().min(1).max(500).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  responsibleText: z.string().nullable().optional(),
  outcomeExpected: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const item = await updateAgendaItem(id, body);
    return Response.json({ item });
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
    await deleteAgendaItem(id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
