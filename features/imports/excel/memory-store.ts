import type { ExistingMeetingSnapshot, PreviewAgendaItem, PreviewMeeting } from "@/types/import";
import type { ImportStore } from "./sync";

interface StoredMeeting extends ExistingMeetingSnapshot {
  id: string;
}

export class InMemoryImportStore implements ImportStore {
  meetings = new Map<string, StoredMeeting>();

  constructor(initial: StoredMeeting[] = []) {
    for (const meeting of initial) {
      this.meetings.set(meeting.externalId, meeting);
    }
  }

  async getExistingSnapshots(): Promise<ExistingMeetingSnapshot[]> {
    return Array.from(this.meetings.values());
  }

  async upsertMeeting(meeting: PreviewMeeting): Promise<{ created: boolean; meetingId: string }> {
    const existing = this.meetings.get(meeting.externalId);
    if (existing) {
      this.meetings.set(meeting.externalId, {
        ...existing,
        title: meeting.title,
        meetingDate: meeting.meetingDate,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        meetingLink: meeting.meetingLink,
      });
      return { created: false, meetingId: existing.id };
    }

    const id = `meeting-${this.meetings.size + 1}`;
    this.meetings.set(meeting.externalId, {
      id,
      externalId: meeting.externalId,
      title: meeting.title,
      meetingDate: meeting.meetingDate,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      meetingLink: meeting.meetingLink,
      agenda: [],
    });
    return { created: true, meetingId: id };
  }

  async replaceAgenda(meetingId: string, agenda: PreviewAgendaItem[]): Promise<number> {
    const meeting = Array.from(this.meetings.values()).find((item) => item.id === meetingId);
    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }
    meeting.agenda = agenda.map((item) => ({
      topic: item.topic,
      startTime: item.startTime,
      endTime: item.endTime,
      responsibleText: item.responsibleText,
      outcomeExpected: item.outcomeExpected,
      sortOrder: item.sortOrder,
    }));
    return agenda.length;
  }
}
