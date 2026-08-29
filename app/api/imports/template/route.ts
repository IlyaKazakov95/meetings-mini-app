import { jsonError, requireAdmin } from "@/lib/auth/session";
import { buildScheduleTemplate, TEMPLATE_FILENAME } from "@/features/imports/excel";

export async function GET() {
  try {
    await requireAdmin();
    const buffer = buildScheduleTemplate();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${TEMPLATE_FILENAME}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
