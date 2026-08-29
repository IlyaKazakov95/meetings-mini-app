import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";

export function mondayOf(date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function weekStartIso(date = new Date()): string {
  return format(mondayOf(date), "yyyy-MM-dd");
}

export function formatWeekRange(weekStart: string): string {
  const start = parseISO(weekStart);
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "MMM d")}–${format(end, "d")}`;
  }
  return `${format(start, "MMM d")}–${format(end, "MMM d")}`;
}

export function dayLabel(date: string, today = new Date()): string {
  const value = parseISO(date);
  if (isSameDay(value, today)) return "TODAY";
  if (isSameDay(value, addDays(today, 1))) return "TOMORROW";
  return format(value, "EEE d MMM").toUpperCase();
}

export function formatMeetingDate(date: string): string {
  return format(parseISO(date), "d MMM yyyy");
}

export function formatDue(date: string): string {
  return format(parseISO(date), "d MMM");
}
