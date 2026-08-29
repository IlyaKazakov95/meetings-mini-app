export type NotificationEvent =
  | "new_meeting"
  | "attendance_reminder"
  | "meeting_starts_soon"
  | "minutes_available"
  | "action_assigned"
  | "action_due_soon"
  | "overdue_action";

export interface NotificationPayload {
  event: NotificationEvent;
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

export interface NotificationService {
  enqueue(payload: NotificationPayload): Promise<void>;
}

class InMemoryNotificationService implements NotificationService {
  async enqueue(payload: NotificationPayload): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.info("[notifications]", payload.event, payload.title, payload.userIds.length);
    }
  }
}

export const notifications: NotificationService = new InMemoryNotificationService();
