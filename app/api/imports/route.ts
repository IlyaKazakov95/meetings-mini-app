import { jsonError, requireAdmin } from "@/lib/auth/session";
import { listImports } from "@/services/imports";

export async function GET() {
  try {
    await requireAdmin();
    const imports = await listImports();
    return Response.json({ imports });
  } catch (error) {
    return jsonError(error);
  }
}
