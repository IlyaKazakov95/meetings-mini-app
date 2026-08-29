export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function displayName(user: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  telegramUsername?: string | null;
}): string {
  if (user.displayName?.trim()) return user.displayName.trim();
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.telegramUsername) return `@${user.telegramUsername}`;
  return "User";
}

export function formatTimeRange(start: string | null, end: string | null): string | null {
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  if (end) return end;
  return null;
}

export function sanitizeText(value: string, maxLength = 4000): string {
  return value.replace(/\u0000/g, "").trim().slice(0, maxLength);
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}
