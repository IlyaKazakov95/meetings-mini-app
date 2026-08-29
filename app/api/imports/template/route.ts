import { jsonError } from "@/lib/auth/session";
import { buildScheduleTemplate, TEMPLATE_FILENAME } from "@/features/imports/excel";

export const runtime = "nodejs";

export async function GET() {
  try {
    const buffer = buildScheduleTemplate();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${TEMPLATE_FILENAME}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
