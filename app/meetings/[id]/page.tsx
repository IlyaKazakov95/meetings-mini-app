import { MeetingDetailScreen } from "@/features/meetings/meeting-detail";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingDetailScreen meetingId={id} />;
}
