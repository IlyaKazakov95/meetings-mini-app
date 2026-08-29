"use client";

import { addDays, formatISO, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { formatDue } from "@/lib/week";
import type { ActionItem, ActionStatus } from "@/types/domain";

function startOfToday(): string {
  return formatISO(new Date(), { representation: "date" });
}

export function MyActionsScreen() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const today = startOfToday();
  const weekEnd = formatISO(addDays(parseISO(today), 7), { representation: "date" });

  async function reload() {
    const data = await api<{ actions: ActionItem[] }>("/api/actions");
    setActions(data.actions);
  }

  useEffect(() => {
    reload()
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const overdue: ActionItem[] = [];
    const thisWeek: ActionItem[] = [];
    const later: ActionItem[] = [];
    const completed: ActionItem[] = [];

    for (const action of actions) {
      if (action.status === "done" || action.status === "cancelled") {
        completed.push(action);
        continue;
      }
      if (action.dueDate && action.dueDate < today) {
        overdue.push(action);
      } else if (action.dueDate && action.dueDate <= weekEnd) {
        thisWeek.push(action);
      } else {
        later.push(action);
      }
    }

    return [
      { title: "Overdue", items: overdue },
      { title: "This week", items: thisWeek },
      { title: "Later", items: later },
      { title: "Completed", items: completed },
    ];
  }, [actions, today, weekEnd]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (actions.length === 0) {
    return <EmptyState title="No actions" text="Tasks assigned to you after meetings will appear here." />;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">My Actions</h1>
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.title} className="space-y-3">
            <h2 className="text-xs font-semibold tracking-wide text-muted">{group.title.toUpperCase()}</h2>
            {group.items.map((item) => (
              <article key={item.id} className="rounded-3xl bg-card p-4">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">Meeting: {item.meetingTitle ?? "Meeting"}</p>
                <p className="text-sm text-muted">Due: {item.dueDate ? formatDue(item.dueDate) : "No date"}</p>
                <select
                  className="mt-3"
                  value={item.status}
                  onChange={async (event) => {
                    await api(`/api/actions/${item.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: event.target.value as ActionStatus }),
                    });
                    await reload();
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </article>
            ))}
          </section>
        ),
      )}
    </div>
  );
}
