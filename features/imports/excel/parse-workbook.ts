import * as XLSX from "xlsx";
import type { HeaderField, ParsedExcelRow } from "@/types/import";
import { normalizeHeaders } from "./normalize-headers";
import { normalizeDate } from "./normalize-date";
import { normalizeTime } from "./normalize-time";
import { forwardFillMergedValues } from "./forward-fill";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function cellToRaw(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}

function readText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).replace(/\r\n/g, "\n").trim();
  return text === "" ? null : text;
}

export function parseWorkbook(buffer: ArrayBuffer | Buffer): ParsedExcelRow[] {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error("XLSX file is larger than 5 MB");
  }

  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellFormula: false,
    cellNF: false,
    cellHTML: false,
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Workbook has no sheets");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });

  if (matrix.length < 2) {
    throw new Error("Workbook has no data rows");
  }

  const headerMap = normalizeHeaders(matrix[0] ?? []);
  const required: HeaderField[] = ["date", "meeting", "topic"];
  const missing = required.filter((field) => !headerMap.has(field));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`);
  }

  const parsed: ParsedExcelRow[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] ?? [];
    const get = (field: HeaderField) => {
      const index = headerMap.get(field);
      return index === undefined ? null : cellToRaw(row[index]);
    };

    const rawDate = get("date");
    const rawStart = get("startTime");
    const rawEnd = get("endTime");

    parsed.push({
      sourceRowNumber: i + 1,
      date: rawDate === null ? null : normalizeDate(rawDate),
      meeting: readText(get("meeting")),
      topic: readText(get("topic")),
      startTime: rawStart === null ? null : normalizeTime(rawStart),
      endTime: rawEnd === null ? null : normalizeTime(rawEnd),
      who: readText(get("who")),
      outcomeExpected: readText(get("outcomeExpected")),
      meetingLink: readText(get("meetingLink")),
      raw: {
        date: rawDate,
        meeting: get("meeting"),
        topic: get("topic"),
        startTime: rawStart,
        endTime: rawEnd,
        who: get("who"),
        outcomeExpected: get("outcomeExpected"),
        meetingLink: get("meetingLink"),
      },
    });
  }

  return forwardFillMergedValues(parsed);
}

export function parseWorkbookFromRows(
  rows: ParsedExcelRow[],
): ParsedExcelRow[] {
  return forwardFillMergedValues(rows);
}
