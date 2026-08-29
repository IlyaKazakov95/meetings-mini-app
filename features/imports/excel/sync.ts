import type {
  ExistingMeetingSnapshot,
  ImportPreview,
  PreviewAgendaItem,
  PreviewMeeting,
  SyncResult,
} from "@/types/import";

export interface ImportStore {
  getExistingSnapshots(): Promise<ExistingMeetingSnapshot[]>;
  upsertMeeting(meeting: PreviewMeeting): Promise<{ created: boolean; meetingId: string }>;
  replaceAgenda(meetingId: string, agenda: PreviewAgendaItem[]): Promise<number>;
}

export async function syncMeetings(
  preview: ImportPreview,
  store: ImportStore,
): Promise<SyncResult> {
  let meetingsCreated = 0;
  let meetingsUpdated = 0;
  let meetingsUnchanged = 0;
  let agendaItemsCreated = 0;

  for (const meeting of preview.meetings) {
    if (meeting.operation === "unchanged") {
      meetingsUnchanged += 1;
      continue;
    }

    const result = await store.upsertMeeting(meeting);
    const agendaCount = await store.replaceAgenda(result.meetingId, meeting.agenda);
    agendaItemsCreated += agendaCount;

    if (result.created) {
      meetingsCreated += 1;
    } else {
      meetingsUpdated += 1;
    }
  }

  return {
    meetingsCreated,
    meetingsUpdated,
    meetingsUnchanged,
    agendaItemsCreated,
    warnings: preview.warningCount,
    errors: preview.errorCount,
  };
}

export function agendaFingerprint(agenda: PreviewAgendaItem[]): string {
  return JSON.stringify(
    agenda.map((item) => ({
      topic: item.topic,
      startTime: item.startTime,
      endTime: item.endTime,
      responsibleText: item.responsibleText,
      outcomeExpected: item.outcomeExpected,
      sortOrder: item.sortOrder,
    })),
  );
}
