import { z } from "zod";
import { jsonError, requireAdmin } from "@/lib/auth/session";
import { confirmImport } from "@/services/imports";

const schema = z.object({
  importId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());
    const record = await confirmImport(body.importId);
    return Response.json({ import: record });
  } catch (error) {
    return jsonError(error);
  }
}
