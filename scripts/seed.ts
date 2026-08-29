import { existsSync, readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { addDays, formatISO } from "date-fns";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = new Date();
const iso = (date: Date) => formatISO(date, { representation: "date" });

const users = [
  { telegram_id: 1001, telegram_username: "anna_admin", first_name: "Anna", last_name: "Admin", display_name: "Anna Admin", role: "admin", status: "active" },
  { telegram_id: 1002, telegram_username: "dmitry", first_name: "Dmitry", last_name: "Ivanov", display_name: "Dmitry Ivanov", role: "user", status: "active" },
  { telegram_id: 1003, telegram_username: "maria", first_name: "Maria", last_name: "Petrova", display_name: "Maria Petrova", role: "user", status: "active" },
  { telegram_id: 1004, telegram_username: "ivan", first_name: "Ivan", last_name: "Sokolov", display_name: "Ivan Sokolov", role: "user", status: "active" },
  { telegram_id: 1005, telegram_username: "olga", first_name: "Olga", last_name: "Kuznetsova", display_name: "Olga Kuznetsova", role: "user", status: "active" },
];

const meetingDefs = [
  { title: "ROP", date: "2026-08-31", start: "09:15", end: "11:00", link: "https://teams.microsoft.com/l/meetup-join/example-rop" },
  { title: "BI Weekly", date: iso(today), start: "14:00", end: "15:00", link: "https://teams.microsoft.com/l/meetup-join/example-bi" },
  { title: "Sales Review", date: iso(addDays(today, 1)), start: "11:00", end: "12:00", link: "https://zoom.us/j/123456789" },
  { title: "NKA Sync", date: iso(addDays(today, 2)), start: "10:00", end: "10:45", link: null },
  { title: "Forecast Deep Dive", date: iso(addDays(today, 3)), start: "09:00", end: "10:30", link: "https://meet.google.com/abc-defg-hij" },
  { title: "Channel Directors", date: iso(addDays(today, 3)), start: "16:00", end: "17:00", link: "https://teams.microsoft.com/l/meetup-join/example-cd" },
  { title: "SLT", date: iso(addDays(today, 4)), start: "09:30", end: "11:00", link: "https://teams.microsoft.com/l/meetup-join/example-slt" },
  { title: "Price Monitoring", date: iso(addDays(today, 5)), start: "13:00", end: "13:40", link: null },
  { title: "ROP", date: iso(addDays(today, 7)), start: "09:15", end: "11:00", link: "https://teams.microsoft.com/l/meetup-join/example-rop-2" },
  { title: "Standup", date: iso(today), start: "09:15", end: "09:45", link: "https://teams.microsoft.com/l/meetup-join/example-standup" },
];

async function upsertUser(input: (typeof users)[number]) {
  const { data: existing } = await supabase.from("users").select("id").eq("telegram_id", input.telegram_id).maybeSingle();
  if (existing) {
    await supabase.from("users").update(input).eq("id", existing.id);
    return existing.id as string;
  }
  const { data, error } = await supabase.from("users").insert(input).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function upsertMeeting(input: (typeof meetingDefs)[number], index: number) {
  const externalId = `${input.date}__${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_seed_${index}`;
  const payload = {
    external_id: externalId,
    title: input.title,
    meeting_date: input.date,
    start_time: input.start,
    end_time: input.end,
    meeting_link: input.link,
    status: "scheduled",
    source: "manual",
  };
  const { data: existing } = await supabase.from("meetings").select("id").eq("external_id", externalId).maybeSingle();
  if (existing) {
    await supabase.from("meetings").update(payload).eq("id", existing.id);
    return existing.id as string;
  }
  const { data, error } = await supabase.from("meetings").insert(payload).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function main() {
  const userIds: string[] = [];
  for (const user of users) {
    userIds.push(await upsertUser(user));
  }

  const meetingIds: string[] = [];
  for (const [index, meeting] of meetingDefs.entries()) {
    meetingIds.push(await upsertMeeting(meeting, index));
  }

  const [ropId, biId] = meetingIds;

  await supabase.from("agenda_items").delete().in("meeting_id", meetingIds);
  await supabase.from("agenda_items").insert([
    { meeting_id: ropId, topic: "Sales Estimates and Customer/Regions/D2C updates", start_time: "09:15", end_time: "10:00", responsible_text: "D. Smirnova\nChannel Directors", outcome_expected: "P9 sales forecast. News by channels.", sort_order: 0 },
    { meeting_id: ropId, topic: "2027 forecast", start_time: "10:00", end_time: "10:40", responsible_text: "SLT\nA. Perezhogina", outcome_expected: "1. 2027 base scenario discussion\n2. 2027 forecast — growth acceleration stream launch\n3. Next steps alignment", sort_order: 1 },
    { meeting_id: ropId, topic: "Finish goods quotas approach", start_time: "10:40", end_time: "11:00", responsible_text: "SLT\nA. Perezhogina", outcome_expected: "Approach pre-alignment", sort_order: 2 },
    { meeting_id: biId, topic: "Sprint results", start_time: "14:00", end_time: "14:15", responsible_text: "Dmitry Ivanov", outcome_expected: "Status by stream", sort_order: 0 },
    { meeting_id: biId, topic: "Price Monitoring", start_time: "14:15", end_time: "14:30", responsible_text: "Channel Directors", outcome_expected: "Exceptions only", sort_order: 1 },
    { meeting_id: biId, topic: "NKA Sell Out", start_time: "14:30", end_time: "14:45", responsible_text: "Maria Petrova", outcome_expected: "Gap vs plan", sort_order: 2 },
    { meeting_id: biId, topic: "Blockers", start_time: "14:45", end_time: "15:00", responsible_text: "SLT", outcome_expected: "Owners and dates", sort_order: 3 },
  ]);

  await supabase.from("meeting_participants").delete().in("meeting_id", meetingIds);
  const attendance = ["going", "maybe", "not_going", null, "going"] as const;
  const rows = meetingIds.flatMap((meetingId) =>
    userIds.map((userId, index) => ({
      meeting_id: meetingId,
      user_id: userId,
      attendance_status: attendance[index] ?? null,
    })),
  );
  await supabase.from("meeting_participants").insert(rows);

  await supabase.from("meeting_minutes").upsert({
    meeting_id: biId,
    summary: "Reviewed sprint results and agreed to keep the current forecast cadence.",
    created_by: userIds[0],
  }, { onConflict: "meeting_id" });

  await supabase.from("decisions").delete().eq("meeting_id", biId);
  await supabase.from("decisions").insert([
    { meeting_id: biId, text: "Keep weekly NKA check until P9 close.", sort_order: 0 },
    { meeting_id: biId, text: "Price exceptions go to Channel Directors first.", sort_order: 1 },
  ]);

  await supabase.from("action_items").delete().in("meeting_id", [ropId, biId]);
  await supabase.from("action_items").insert([
    { meeting_id: biId, title: "Prepare PSS analysis", owner_id: userIds[1], due_date: iso(addDays(today, -1)), status: "open" },
    { meeting_id: biId, title: "Share NKA sell-out pack", owner_id: userIds[2], due_date: iso(addDays(today, 2)), status: "in_progress" },
    { meeting_id: ropId, title: "Align 2027 base scenario", owner_id: userIds[1], due_date: iso(addDays(today, 10)), status: "open" },
    { meeting_id: ropId, title: "Send quota approach draft", owner_id: userIds[3], due_date: iso(addDays(today, 4)), status: "done" },
  ]);

  console.log("Seed completed");
  console.log("Demo users: 1001 (admin), 1002-1005 (users)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
