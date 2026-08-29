import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { createAgendaFromLines, createAgendaItem, reorderAgenda } from "@/services/agenda";

const createSchema = z.object({
  topic: z.string().min(1).max(500).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  responsibleText: z.string().nullable().optional(),
  outcomeExpected: z.string().nullable().optional(),
  quickText: z.string().optional(),
  orderedIds: z.array(z.string().uuid()).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = createSchema.parse(await request.json());

    if (body.orderedIds) {
      await reorderAgenda(id, body.orderedIds);
      return Response.json({ ok: true });
    }

    if (body.quickText) {
      const items = await createAgendaFromLines(id, body.quickText);
      return Response.json({ items });
    }

    if (!body.topic) {
      return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    const item = await createAgendaItem(id, body);
    return Response.json({ item });
  } catch (error) {
    return jsonError(error);
  }
}
