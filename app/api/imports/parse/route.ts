import { jsonError, requireAdmin } from "@/lib/auth/session";
import { createPreviewImport } from "@/services/imports";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "XLSX file is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return Response.json({ error: "Only .xlsx files are supported" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File is larger than 5 MB" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const record = await createPreviewImport(file.name, user.id, buffer);
    return Response.json({ import: record, preview: record.previewData });
  } catch (error) {
    return jsonError(error);
  }
}
