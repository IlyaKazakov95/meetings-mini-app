import * as XLSX from "xlsx";

const HEADERS = [
  "Date",
  "Meeting",
  "Topic",
  "Start_Time",
  "End_Time",
  "Who",
  "Outcome_expected",
  "Meeting_Link",
] as const;

const EXAMPLE_ROWS = [
  [
    "31.08.2026",
    "ROP",
    "Sales Estimates and Customer/Regions/D2C updates",
    "09:15",
    "10:00",
    "D. Smirnova; Channel Directors",
    "P9 sales forecast. News by channels.",
    "https://teams.microsoft.com/l/meetup-join/example",
  ],
  [
    "31.08.2026",
    "ROP",
    "2027 forecast",
    "10:00",
    "10:40",
    "SLT; A. Perezhogina",
    "1. 2027 base scenario discussion\n2. 2027 forecast — growth acceleration stream launch\n3. Next steps alignment",
    "https://teams.microsoft.com/l/meetup-join/example",
  ],
  [
    "31.08.2026",
    "ROP",
    "Finish goods quotas approach",
    "10:40",
    "11:00",
    "SLT; A. Perezhogina",
    "Approach pre-alignment",
    "https://teams.microsoft.com/l/meetup-join/example",
  ],
];

export function buildScheduleTemplate(): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...EXAMPLE_ROWS]);
  sheet["!cols"] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 48 },
    { wch: 12 },
    { wch: 12 },
    { wch: 28 },
    { wch: 42 },
    { wch: 42 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Schedule");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export const TEMPLATE_FILENAME = "meeting_schedule_template.xlsx";
