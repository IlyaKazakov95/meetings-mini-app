import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildImportPreview,
  buildMeetingExternalId,
  normalizeDate,
  normalizeHeaders,
  normalizeTime,
  parseWorkbook,
  parseWorkbookFromRows,
  syncMeetings,
} from "@/features/imports/excel";
import { InMemoryImportStore } from "@/features/imports/excel/memory-store";
import type { ParsedExcelRow } from "@/types/import";

function row(
  sourceRowNumber: number,
  values: Partial<ParsedExcelRow> & Pick<ParsedExcelRow, "date" | "meeting" | "topic">,
): ParsedExcelRow {
  return {
    sourceRowNumber,
    startTime: values.startTime ?? null,
    endTime: values.endTime ?? null,
    who: values.who ?? null,
    outcomeExpected: values.outcomeExpected ?? null,
    meetingLink: values.meetingLink ?? null,
    raw: values.raw ?? {
      date: values.date,
      meeting: values.meeting,
      topic: values.topic,
      startTime: values.startTime ?? null,
      endTime: values.endTime ?? null,
    },
    ...values,
  };
}

function workbookFromAoa(data: unknown[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Schedule");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return buffer;
}

describe("normalizeDate / normalizeTime / headers", () => {
  it("normalizes dd.mm.yyyy, iso and excel serial dates", () => {
    expect(normalizeDate("31.08.2026")).toBe("2026-08-31");
    expect(normalizeDate("2026-08-31")).toBe("2026-08-31");
    expect(normalizeDate(46265)).toBe("2026-08-31");
  });

  it("normalizes clock times and excel fractions", () => {
    expect(normalizeTime("09:15")).toBe("09:15");
    expect(normalizeTime("9:15")).toBe("09:15");
    expect(normalizeTime(9.25 / 24)).toBe("09:15");
  });

  it("matches header aliases after trim and case folding", () => {
    const map = normalizeHeaders([" Meeting Date ", "Встреча", "Agenda Topic", "Start Time"]);
    expect(map.get("date")).toBe(0);
    expect(map.get("meeting")).toBe(1);
    expect(map.get("topic")).toBe(2);
    expect(map.get("startTime")).toBe(3);
  });
});

describe("grouping and preview", () => {
  it("groups one meeting from several agenda rows and computes start/end", () => {
    const rows = [
      row(2, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic A",
        startTime: "09:15",
        endTime: "10:00",
        who: "D. Smirnova",
        outcomeExpected: "P9",
        meetingLink: "https://teams.microsoft.com/a",
      }),
      row(3, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic B",
        startTime: "10:00",
        endTime: "10:40",
        who: "SLT",
        outcomeExpected: "Forecast",
        meetingLink: "https://teams.microsoft.com/a",
      }),
      row(4, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic C",
        startTime: "10:40",
        endTime: "11:00",
        who: "SLT",
        outcomeExpected: "Alignment",
        meetingLink: "https://teams.microsoft.com/a",
      }),
    ];

    const preview = buildImportPreview(rows);
    expect(preview.meetingsFound).toBe(1);
    expect(preview.agendaTopics).toBe(3);
    expect(preview.meetings[0]?.externalId).toBe("2026-08-31__rop");
    expect(preview.meetings[0]?.startTime).toBe("09:15");
    expect(preview.meetings[0]?.endTime).toBe("11:00");
    expect(preview.meetings[0]?.operation).toBe("create");
    expect(preview.canImport).toBe(true);
  });

  it("keeps meetings with the same title on different dates separate", () => {
    const rows = [
      row(2, { date: "2026-08-31", meeting: "ROP", topic: "A", startTime: "09:00", endTime: "10:00" }),
      row(3, { date: "2026-09-07", meeting: "ROP", topic: "B", startTime: "09:00", endTime: "10:00" }),
    ];

    const preview = buildImportPreview(rows);
    expect(preview.meetingsFound).toBe(2);
    expect(preview.meetings.map((item) => item.externalId)).toEqual([
      "2026-08-31__rop",
      "2026-09-07__rop",
    ]);
  });

  it("groups several meetings on the same day", () => {
    const rows = [
      row(2, { date: "2026-08-31", meeting: "ROP", topic: "A", startTime: "09:00", endTime: "10:00" }),
      row(3, { date: "2026-08-31", meeting: "BI Weekly", topic: "B", startTime: "14:00", endTime: "15:00" }),
    ];

    const preview = buildImportPreview(rows);
    expect(preview.meetingsFound).toBe(2);
    expect(preview.meetings[1]?.externalId).toBe(buildMeetingExternalId("2026-08-31", "BI Weekly"));
  });

  it("forward-fills merged Date and Meeting cells", () => {
    const rows = parseWorkbookFromRows([
      row(2, { date: "2026-08-31", meeting: "ROP", topic: "Topic A", startTime: "09:15", endTime: "10:00" }),
      row(3, { date: null, meeting: null, topic: "Topic B", startTime: "10:00", endTime: "10:40" }),
      row(4, { date: null, meeting: null, topic: "Topic C", startTime: "10:40", endTime: "11:00" }),
    ]);

    const preview = buildImportPreview(rows);
    expect(preview.meetingsFound).toBe(1);
    expect(preview.agendaTopics).toBe(3);
    expect(preview.meetings[0]?.agenda.map((item) => item.topic)).toEqual([
      "Topic A",
      "Topic B",
      "Topic C",
    ]);
  });

  it("does not forward-fill Topic, Who or times", () => {
    const rows = parseWorkbookFromRows([
      row(2, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic A",
        startTime: "09:15",
        endTime: "10:00",
        who: "SLT",
      }),
      row(3, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: null,
        startTime: null,
        endTime: null,
        who: null,
      }),
    ]);

    const preview = buildImportPreview(rows);
    expect(preview.canImport).toBe(false);
    expect(preview.errors.some((issue) => issue.code === "missing_topic")).toBe(true);
  });

  it("keeps optional blank fields as warnings, not errors", () => {
    const rows = [
      row(2, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic A",
        startTime: "09:15",
        endTime: "10:00",
      }),
    ];

    const preview = buildImportPreview(rows);
    expect(preview.canImport).toBe(true);
    expect(preview.warnings.map((item) => item.code)).toEqual(
      expect.arrayContaining(["empty_who", "empty_outcome", "empty_meeting_link"]),
    );
  });

  it("warns on conflicting meeting links", () => {
    const rows = [
      row(2, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "A",
        startTime: "09:00",
        endTime: "10:00",
        meetingLink: "https://teams.microsoft.com/a",
      }),
      row(3, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "B",
        startTime: "10:00",
        endTime: "11:00",
        meetingLink: "https://zoom.us/b",
      }),
    ];

    const preview = buildImportPreview(rows);
    expect(preview.canImport).toBe(true);
    expect(preview.warnings.some((item) => item.code === "conflicting_meeting_links")).toBe(true);
    expect(preview.meetings[0]?.meetingLink).toBe("https://teams.microsoft.com/a");
  });

  it("warns on duplicate topics, overlaps and gaps", () => {
    const rows = [
      row(2, { date: "2026-08-31", meeting: "ROP", topic: "Topic A", startTime: "10:00", endTime: "10:30" }),
      row(3, { date: "2026-08-31", meeting: "ROP", topic: "Topic A", startTime: "10:20", endTime: "11:00" }),
      row(4, { date: "2026-08-31", meeting: "ROP", topic: "Topic C", startTime: "11:30", endTime: "12:00" }),
    ];

    const preview = buildImportPreview(rows);
    expect(preview.canImport).toBe(true);
    expect(preview.warnings.some((item) => item.code === "duplicate_topic")).toBe(true);
    expect(preview.warnings.some((item) => item.code === "agenda_overlap")).toBe(true);
    expect(preview.warnings.some((item) => item.code === "agenda_gap")).toBe(true);
  });
});

describe("real xlsx workbooks", () => {
  it("parses a simple workbook with one meeting", () => {
    const buffer = workbookFromAoa([
      ["Date", "Meeting", "Topic", "Start_Time", "End_Time", "Who", "Outcome_expected", "Meeting_Link"],
      ["31.08.2026", "ROP", "Topic A", "09:15", "10:00", "D. Smirnova", "P9", "https://teams.microsoft.com/a"],
      ["31.08.2026", "ROP", "Topic B", "10:00", "10:40", "SLT", "Forecast", "https://teams.microsoft.com/a"],
    ]);

    const preview = buildImportPreview(parseWorkbook(buffer));
    expect(preview.meetingsFound).toBe(1);
    expect(preview.agendaTopics).toBe(2);
    expect(preview.meetings[0]?.startTime).toBe("09:15");
    expect(preview.meetings[0]?.endTime).toBe("10:40");
  });

  it("parses merged Date and Meeting cells", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Date", "Meeting", "Topic", "Start_Time", "End_Time"],
      ["31.08.2026", "ROP", "Topic A", "09:15", "10:00"],
      [null, null, "Topic B", "10:00", "10:40"],
      [null, null, "Topic C", "10:40", "11:00"],
    ]);
    sheet["!merges"] = [
      { s: { r: 1, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 1, c: 1 }, e: { r: 3, c: 1 } },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Schedule");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const preview = buildImportPreview(parseWorkbook(buffer));
    expect(preview.meetingsFound).toBe(1);
    expect(preview.agendaTopics).toBe(3);
  });
});

describe("idempotent import sync", () => {
  const baseRows = [
    row(2, {
      date: "2026-08-31",
      meeting: "ROP",
      topic: "Topic A",
      startTime: "09:15",
      endTime: "10:00",
      who: "SLT",
      outcomeExpected: "Align",
      meetingLink: "https://teams.microsoft.com/a",
    }),
    row(3, {
      date: "2026-08-31",
      meeting: "ROP",
      topic: "Topic B",
      startTime: "10:00",
      endTime: "10:40",
      who: "SLT",
      outcomeExpected: "Forecast",
      meetingLink: "https://teams.microsoft.com/a",
    }),
  ];

  it("creates a meeting once and reports 0 changes on repeated import", async () => {
    const store = new InMemoryImportStore();
    const first = buildImportPreview(baseRows, await store.getExistingSnapshots());
    const created = await syncMeetings(first, store);
    expect(created.meetingsCreated).toBe(1);
    expect(store.meetings.size).toBe(1);

    const secondPreview = buildImportPreview(baseRows, await store.getExistingSnapshots());
    expect(secondPreview.unchangedMeetings).toBe(1);
    const second = await syncMeetings(secondPreview, store);
    expect(second.meetingsCreated).toBe(0);
    expect(second.meetingsUpdated).toBe(0);
    expect(second.meetingsUnchanged).toBe(1);
    expect(store.meetings.size).toBe(1);
  });

  it("updates meeting time and title without creating a duplicate", async () => {
    const store = new InMemoryImportStore();
    await syncMeetings(buildImportPreview(baseRows, await store.getExistingSnapshots()), store);

    const updatedRows = [
      row(2, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic A",
        startTime: "09:00",
        endTime: "10:00",
        who: "SLT",
        outcomeExpected: "Align",
        meetingLink: "https://teams.microsoft.com/a",
      }),
      row(3, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic B",
        startTime: "10:00",
        endTime: "11:00",
        who: "SLT",
        outcomeExpected: "Forecast",
        meetingLink: "https://teams.microsoft.com/a",
      }),
    ];

    const preview = buildImportPreview(updatedRows, await store.getExistingSnapshots());
    expect(preview.updatedMeetings).toBe(1);
    const result = await syncMeetings(preview, store);
    expect(result.meetingsUpdated).toBe(1);
    expect(store.meetings.size).toBe(1);
    expect(store.meetings.get("2026-08-31__rop")?.startTime).toBe("09:00");
    expect(store.meetings.get("2026-08-31__rop")?.endTime).toBe("11:00");
  });

  it("adds, updates and deletes agenda topics from a new file", async () => {
    const store = new InMemoryImportStore();
    await syncMeetings(buildImportPreview(baseRows, await store.getExistingSnapshots()), store);

    const nextRows = [
      row(2, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic A updated",
        startTime: "09:15",
        endTime: "10:00",
        who: "Channel Directors",
        outcomeExpected: "Align",
        meetingLink: "https://teams.microsoft.com/a",
      }),
      row(3, {
        date: "2026-08-31",
        meeting: "ROP",
        topic: "Topic C",
        startTime: "10:40",
        endTime: "11:00",
        who: "SLT",
        outcomeExpected: "New",
        meetingLink: "https://teams.microsoft.com/a",
      }),
    ];

    const preview = buildImportPreview(nextRows, await store.getExistingSnapshots());
    await syncMeetings(preview, store);

    const agenda = store.meetings.get("2026-08-31__rop")?.agenda ?? [];
    expect(agenda.map((item) => item.topic)).toEqual(["Topic A updated", "Topic C"]);
    expect(agenda).toHaveLength(2);
  });
});
