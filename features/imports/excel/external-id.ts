export function normalizeMeetingName(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildMeetingExternalId(date: string, meetingName: string): string {
  return `${date}__${normalizeMeetingName(meetingName)}`;
}
