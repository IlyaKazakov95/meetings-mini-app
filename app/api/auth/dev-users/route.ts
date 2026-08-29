import { isDevelopment } from "@/lib/env";
import { listUsers } from "@/services/auth";

export async function GET() {
  if (!isDevelopment()) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const users = await listUsers();
  return Response.json({ users });
}
