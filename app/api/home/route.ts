import { formatISO } from "date-fns";
import { jsonError, requireUser } from "@/lib/auth/session";
import { getHomeCounters } from "@/services/meetings";

export async function GET() {
  try {
    const user = await requireUser();
    const today = formatISO(new Date(), { representation: "date" });
    const counters = await getHomeCounters(user.id, today);
    return Response.json({ counters });
  } catch (error) {
    return jsonError(error);
  }
}
