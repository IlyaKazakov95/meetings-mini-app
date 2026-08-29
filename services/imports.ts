import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapImport, mapTime } from "@/lib/mappers";
import {
  buildImportPreview,
  parseWorkbook,
  syncMeetings,
  type ImportStore,
} from "@/features/imports/excel";
import type { ExistingMeetingSnapshot, ImportPreview, PreviewAgendaItem, PreviewMeeting } from "@/types/import";
import type { ImportRecord } from "@/types/domain";

class SupabaseImportStore implements ImportStore {
  constructor(private importId: string) {}

  async getExistingSnapshots(): Promise<ExistingMeetingSnapshot[]> {
    return loadExistingSnapshots();
  }

  async upsertMeeting(meeting: PreviewMeeting): Promise<{ created: boolean; meetingId: string }> {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("meetings")
      .select("id")
      .eq("external_id", meeting.externalId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("meetings")
        .update({
          title: meeting.title,
          meeting_date: meeting.meetingDate,
          start_time: meeting.startTime,
          end_time: meeting.endTime,
          meeting_link: meeting.meetingLink,
          source: "xlsx",
          source_import_id: this.importId,
          status: "scheduled",
        })
        .eq("id", existing.id);

      if (error) throw error;
      return { created: false, meetingId: existing.id };
    }

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        external_id: meeting.externalId,
        title: meeting.title,
        meeting_date: meeting.meetingDate,
        start_time: meeting.startTime,
        end_time: meeting.endTime,
        meeting_link: meeting.meetingLink,
        source: "xlsx",
        source_import_id: this.importId,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (error) throw error;
    return { created: true, meetingId: data.id };
  }

  async replaceAgenda(meetingId: string, agenda: PreviewAgendaItem[]): Promise<number> {
    const supabase = getSupabaseAdmin();
    const { error: deleteError } = await supabase.from("agenda_items").delete().eq("meeting_id", meetingId);
    if (deleteError) throw deleteError;

    if (agenda.length === 0) return 0;

    const { error } = await supabase.from("agenda_items").insert(
      agenda.map((item) => ({
        meeting_id: meetingId,
        topic: item.topic,
        start_time: item.startTime,
        end_time: item.endTime,
        responsible_text: item.responsibleText,
        outcome_expected: item.outcomeExpected,
        sort_order: item.sortOrder,
        source_row_number: item.sourceRowNumber,
      })),
    );

    if (error) throw error;
    return agenda.length;
  }
}

export async function loadExistingSnapshots(): Promise<ExistingMeetingSnapshot[]> {
  const supabase = getSupabaseAdmin();
  const { data: meetings, error } = await supabase.from("meetings").select("*");
  if (error) throw error;

  const ids = (meetings ?? []).map((item) => item.id);
  const { data: agenda, error: agendaError } = ids.length
    ? await supabase.from("agenda_items").select("*").in("meeting_id", ids).order("sort_order")
    : { data: [], error: null };

  if (agendaError) throw agendaError;

  return (meetings ?? []).map((meeting) => ({
    externalId: meeting.external_id,
    title: meeting.title,
    meetingDate: meeting.meeting_date,
    startTime: mapTime(meeting.start_time),
    endTime: mapTime(meeting.end_time),
    meetingLink: meeting.meeting_link,
    agenda: (agenda ?? [])
      .filter((item) => item.meeting_id === meeting.id)
      .map((item) => ({
        topic: item.topic,
        startTime: mapTime(item.start_time),
        endTime: mapTime(item.end_time),
        responsibleText: item.responsible_text,
        outcomeExpected: item.outcome_expected,
        sortOrder: item.sort_order,
      })),
  }));
}

export async function createPreviewImport(
  filename: string,
  uploadedBy: string,
  buffer: ArrayBuffer,
): Promise<ImportRecord> {
  const rows = parseWorkbook(buffer);
  const existing = await loadExistingSnapshots();
  const preview = buildImportPreview(rows, existing);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("imports")
    .insert({
      filename,
      uploaded_by: uploadedBy,
      status: preview.canImport ? "preview" : "validation_failed",
      rows_total: preview.rowsTotal,
      rows_failed: preview.rowsFailed,
      meetings_created: preview.newMeetings,
      meetings_updated: preview.updatedMeetings,
      agenda_items_created: preview.agendaTopics,
      error_log: { errors: preview.errors, warnings: preview.warnings },
      preview_data: preview,
    })
    .select("*, users(display_name, first_name)")
    .single();

  if (error) throw error;
  return mapImport(data);
}

export async function confirmImport(importId: string): Promise<ImportRecord> {
  const supabase = getSupabaseAdmin();
  const { data: record, error } = await supabase.from("imports").select("*").eq("id", importId).single();
  if (error) throw error;

  const preview = record.preview_data as ImportPreview | null;
  if (!preview) {
    throw new Error("Import preview is missing");
  }
  if (!preview.canImport) {
    throw new Error("Import has blocking validation errors");
  }

  const result = await syncMeetings(preview, new SupabaseImportStore(importId));

  const { data, error: updateError } = await supabase
    .from("imports")
    .update({
      status: "completed",
      meetings_created: result.meetingsCreated,
      meetings_updated: result.meetingsUpdated,
      agenda_items_created: result.agendaItemsCreated,
      rows_failed: preview.rowsFailed,
      error_log: { errors: preview.errors, warnings: preview.warnings },
    })
    .eq("id", importId)
    .select("*, users(display_name, first_name)")
    .single();

  if (updateError) throw updateError;
  return mapImport(data);
}

export async function listImports(): Promise<ImportRecord[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("imports")
    .select("*, users(display_name, first_name)")
    .order("uploaded_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map(mapImport);
}

export async function getImport(id: string): Promise<ImportRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("imports")
    .select("*, users(display_name, first_name)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapImport(data) : null;
}
