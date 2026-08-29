function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function minutesFromTime(time: string): number | null {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatTime(hours: number, minutes: number): string | null {
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return `${pad(hours)}:${pad(minutes)}`;
}

export function excelFractionToTime(value: number): string | null {
  if (!Number.isFinite(value)) return null;

  let fraction = value;
  if (fraction >= 1) {
    fraction = fraction % 1;
  }
  if (fraction < 0) return null;

  const totalMinutes = Math.round(fraction * 24 * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return formatTime(hours, minutes);
}

export function normalizeTime(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatTime(value.getHours(), value.getMinutes());
  }

  if (typeof value === "number") {
    if (value >= 0 && value < 1.0001) {
      return excelFractionToTime(value);
    }
    if (value >= 1 && value < 24) {
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      return formatTime(hours, minutes === 60 ? 0 : minutes);
    }
    return excelFractionToTime(value);
  }

  const text = String(value).trim();
  if (!text) return null;

  const hm = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hm) {
    return formatTime(Number(hm[1]), Number(hm[2]));
  }

  const compact = text.match(/^(\d{1,2})(\d{2})$/);
  if (compact && Number(compact[1]) <= 23) {
    return formatTime(Number(compact[1]), Number(compact[2]));
  }

  return null;
}

export function isEndBeforeOrEqualStart(
  startTime: string | null,
  endTime: string | null,
): boolean {
  if (!startTime || !endTime) return false;
  const start = minutesFromTime(startTime);
  const end = minutesFromTime(endTime);
  if (start === null || end === null) return false;
  return end <= start;
}
