"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { formatMeetingDate } from "@/lib/week";
import { displayName, formatTimeRange } from "@/lib/utils";
import type { ActionStatus, AgendaItem, AppUser, AttendanceStatus, MeetingDetail } from "@/types/domain";

export function MeetingDetailScreen({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openList, setOpenList] = useState<AttendanceStatus | "none" | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  async function reload() {
    const data = await api<{ meeting: MeetingDetail; users?: AppUser[] }>(`/api/meetings/${meetingId}`);
    setMeeting(data.meeting);
    if (data.users) setUsers(data.users);
  }

  useEffect(() => {
    reload().catch((loadError: Error) => setError(loadError.message));
  }, [meetingId]);

  if (error) return <ErrorState message={error} />;
  if (!meeting) return <LoadingState />;

  const time = formatTimeRange(meeting.startTime, meeting.endTime);
  const isAdmin = user.role === "admin";

  async function setStatus(status: AttendanceStatus) {
    setSavingAttendance(true);
    try {
      await api(`/api/meetings/${meetingId}/attendance`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
      await reload();
    } finally {
      setSavingAttendance(false);
    }
  }

  function openJoin() {
    const link = meeting?.meetingLink;
    if (!link) return;
    window.Telegram?.WebApp?.openLink(link);
    if (!window.Telegram?.WebApp) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  }

  const named = (status: AttendanceStatus | null) =>
    meeting.participants.filter((item) => item.attendanceStatus === status);

  return (
    <div className="space-y-5">
      <button className="text-sm text-muted" onClick={() => router.push("/meetings")}>
        ‹ Meetings
      </button>

      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{meeting.title}</h1>
        <p className="text-muted">
          {formatMeetingDate(meeting.meetingDate)}
          {time ? ` · ${time}` : ""}
        </p>
      </header>

      {meeting.meetingLink ? (
        <button
          onClick={openJoin}
          className="h-12 w-full rounded-2xl bg-accent text-base font-semibold text-accent-fg"
        >
          Join meeting
        </button>
      ) : null}

      <section className="rounded-3xl bg-card p-4">
        <h2 className="text-xs font-semibold tracking-wide text-muted">ARE YOU COMING?</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatusButton active={meeting.myAttendance === "going"} disabled={savingAttendance} onClick={() => setStatus("going")}>
            ✅ Going
          </StatusButton>
          <StatusButton active={meeting.myAttendance === "not_going"} disabled={savingAttendance} onClick={() => setStatus("not_going")}>
            ❌ Not going
          </StatusButton>
          <StatusButton active={meeting.myAttendance === "maybe"} disabled={savingAttendance} onClick={() => setStatus("maybe")}>
            ❓ Maybe
          </StatusButton>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-4">
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted">PARTICIPANTS</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <CountChip label="Going" value={meeting.attendance.going} onClick={() => setOpenList("going")} />
          <CountChip label="Maybe" value={meeting.attendance.maybe} onClick={() => setOpenList("maybe")} />
          <CountChip label="Not going" value={meeting.attendance.notGoing} onClick={() => setOpenList("not_going")} />
          <CountChip label="No response" value={meeting.attendance.noResponse} onClick={() => setOpenList("none")} />
        </div>
        {openList ? (
          <div className="mt-3 space-y-1 text-sm">
            {(openList === "none" ? named(null) : named(openList)).map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span>{item.user ? displayName(item.user) : "User"}</span>
                {isAdmin ? (
                  <button
                    className="text-danger"
                    onClick={async () => {
                      await api(`/api/meetings/${meetingId}/participants`, {
                        method: "POST",
                        body: JSON.stringify({ removeUserId: item.userId }),
                      });
                      await reload();
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {isAdmin ? (
          <div className="mt-4 space-y-2">
            <button
              className="w-full rounded-2xl bg-bg py-3 text-sm"
              onClick={async () => {
                await api(`/api/meetings/${meetingId}/participants`, {
                  method: "POST",
                  body: JSON.stringify({ addAll: true }),
                });
                await reload();
              }}
            >
              Add all registered users
            </button>
            {users.length > 0 ? (
              <select
                onChange={async (event) => {
                  if (!event.target.value) return;
                  await api(`/api/meetings/${meetingId}/participants`, {
                    method: "POST",
                    body: JSON.stringify({ userIds: [event.target.value] }),
                  });
                  event.target.value = "";
                  await reload();
                }}
              >
                <option value="">+ Add participant</option>
                {users
                  .filter((item) => item.status === "active")
                  .filter((item) => !meeting.participants.some((participant) => participant.userId === item.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {displayName(item)}
                    </option>
                  ))}
              </select>
            ) : null}
          </div>
        ) : null}
      </section>

      <AgendaBlock meeting={meeting} isAdmin={isAdmin} onChange={reload} />
      <MinutesBlock meeting={meeting} isAdmin={isAdmin} onChange={reload} />
      <ActionsBlock meeting={meeting} isAdmin={isAdmin} users={users} onChange={reload} />

      {isAdmin ? (
        <button
          className="w-full rounded-2xl bg-card py-3 text-danger"
          onClick={async () => {
            if (!confirm("Delete this meeting?")) return;
            await api(`/api/meetings/${meetingId}`, { method: "DELETE" });
            router.push("/meetings");
          }}
        >
          Delete meeting
        </button>
      ) : null}
    </div>
  );
}

function StatusButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`min-h-12 rounded-2xl px-2 text-sm font-medium ${active ? "bg-accent text-accent-fg" : "bg-bg"}`}
    >
      {children}
    </button>
  );
}

function CountChip({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl bg-bg px-3 py-3 text-left">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </button>
  );
}

function AgendaBlock({
  meeting,
  isAdmin,
  onChange,
}: {
  meeting: MeetingDetail;
  isAdmin: boolean;
  onChange: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [quick, setQuick] = useState("");

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted">AGENDA</h2>
        {isAdmin ? (
          <button className="text-sm text-accent" onClick={() => setEditing((value) => !value)}>
            {editing ? "Done" : "Edit Agenda"}
          </button>
        ) : null}
      </div>

      {meeting.agenda.length === 0 ? <EmptyState title="No agenda yet" /> : null}

      {meeting.agenda.map((item, index) => (
        <AgendaCard
          key={item.id}
          item={item}
          isAdmin={isAdmin && editing}
          canUp={index > 0}
          canDown={index < meeting.agenda.length - 1}
          onMove={async (direction) => {
            const ids = meeting.agenda.map((agenda) => agenda.id);
            const next = index + direction;
            const [moved] = ids.splice(index, 1);
            ids.splice(next, 0, moved);
            await api(`/api/meetings/${meeting.id}/agenda`, {
              method: "POST",
              body: JSON.stringify({ orderedIds: ids }),
            });
            await onChange();
          }}
          onChange={onChange}
        />
      ))}

      {isAdmin && editing ? (
        <div className="space-y-3 rounded-3xl bg-card p-4">
          <p className="text-sm text-muted">Quick add — one topic per line</p>
          <textarea rows={4} value={quick} onChange={(event) => setQuick(event.target.value)} />
          <button
            className="h-11 w-full rounded-2xl bg-accent font-medium text-accent-fg"
            onClick={async () => {
              if (!quick.trim()) return;
              await api(`/api/meetings/${meeting.id}/agenda`, {
                method: "POST",
                body: JSON.stringify({ quickText: quick }),
              });
              setQuick("");
              await onChange();
            }}
          >
            Add topics
          </button>
        </div>
      ) : null}
    </section>
  );
}

function AgendaCard({
  item,
  isAdmin,
  canUp,
  canDown,
  onMove,
  onChange,
}: {
  item: AgendaItem;
  isAdmin: boolean;
  canUp: boolean;
  canDown: boolean;
  onMove: (direction: -1 | 1) => Promise<void>;
  onChange: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(item);

  useEffect(() => {
    setDraft(item);
  }, [item]);

  const whoLines = (draft.responsibleText ?? "").split(/[;\n]+/).map((line) => line.trim()).filter(Boolean);

  if (!isAdmin) {
    return (
      <article className="rounded-3xl bg-card p-4">
        <p className="text-sm text-accent">{formatTimeRange(item.startTime, item.endTime)}</p>
        <h3 className="mt-1 text-base font-semibold">{item.topic}</h3>
        {whoLines.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-muted">Responsible</p>
            {whoLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
        {item.outcomeExpected ? (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-muted">Expected outcome</p>
            <p className="whitespace-pre-wrap">{item.outcomeExpected}</p>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article className="space-y-2 rounded-3xl bg-card p-4">
      <input value={draft.topic} onChange={(event) => setDraft({ ...draft, topic: event.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input type="time" value={draft.startTime ?? ""} onChange={(event) => setDraft({ ...draft, startTime: event.target.value || null })} />
        <input type="time" value={draft.endTime ?? ""} onChange={(event) => setDraft({ ...draft, endTime: event.target.value || null })} />
      </div>
      <input
        placeholder="Who / Responsible"
        value={draft.responsibleText ?? ""}
        onChange={(event) => setDraft({ ...draft, responsibleText: event.target.value })}
      />
      <textarea
        rows={3}
        placeholder="Outcome expected"
        value={draft.outcomeExpected ?? ""}
        onChange={(event) => setDraft({ ...draft, outcomeExpected: event.target.value })}
      />
      <div className="flex gap-2">
        <button className="flex-1 rounded-2xl bg-bg py-2" disabled={!canUp} onClick={() => onMove(-1)}>
          Up
        </button>
        <button className="flex-1 rounded-2xl bg-bg py-2" disabled={!canDown} onClick={() => onMove(1)}>
          Down
        </button>
        <button
          className="flex-1 rounded-2xl bg-accent py-2 text-accent-fg"
          onClick={async () => {
            await api(`/api/agenda/${item.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                topic: draft.topic,
                startTime: draft.startTime,
                endTime: draft.endTime,
                responsibleText: draft.responsibleText,
                outcomeExpected: draft.outcomeExpected,
              }),
            });
            await onChange();
          }}
        >
          Save
        </button>
        <button
          className="rounded-2xl bg-bg px-3 py-2 text-danger"
          onClick={async () => {
            await api(`/api/agenda/${item.id}`, { method: "DELETE" });
            await onChange();
          }}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function MinutesBlock({
  meeting,
  isAdmin,
  onChange,
}: {
  meeting: MeetingDetail;
  isAdmin: boolean;
  onChange: () => Promise<void>;
}) {
  const [summary, setSummary] = useState(meeting.minutes?.summary ?? "");
  const [decision, setDecision] = useState("");
  const [open, setOpen] = useState(Boolean(meeting.minutes || meeting.decisions.length));

  useEffect(() => {
    setSummary(meeting.minutes?.summary ?? "");
  }, [meeting.minutes?.summary]);

  if (!isAdmin && !meeting.minutes && meeting.decisions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted">MINUTES</h2>
        {isAdmin && !open ? (
          <button className="text-sm text-accent" onClick={() => setOpen(true)}>
            Add Meeting Minutes
          </button>
        ) : null}
      </div>

      {open || meeting.minutes ? (
        <>
          <textarea
            rows={4}
            placeholder="Summary"
            value={summary}
            readOnly={!isAdmin}
            onChange={(event) => setSummary(event.target.value)}
          />
          {isAdmin ? (
            <button
              className="h-11 w-full rounded-2xl bg-accent font-medium text-accent-fg"
              onClick={async () => {
                await api(`/api/meetings/${meeting.id}/minutes`, {
                  method: "POST",
                  body: JSON.stringify({ summary }),
                });
                await onChange();
              }}
            >
              Save summary
            </button>
          ) : null}
        </>
      ) : null}

      <h3 className="pt-2 text-xs font-semibold tracking-wide text-muted">DECISIONS</h3>
      {meeting.decisions.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl bg-bg px-3 py-3">
          <p>{item.text}</p>
          {isAdmin ? (
            <button
              className="text-sm text-danger"
              onClick={async () => {
                await api(`/api/decisions/${item.id}`, { method: "DELETE" });
                await onChange();
              }}
            >
              ✕
            </button>
          ) : null}
        </div>
      ))}
      {isAdmin ? (
        <div className="flex gap-2">
          <input value={decision} placeholder="+ Add decision" onChange={(event) => setDecision(event.target.value)} />
          <button
            className="rounded-2xl bg-accent px-4 text-accent-fg"
            onClick={async () => {
              if (!decision.trim()) return;
              await api(`/api/meetings/${meeting.id}/decisions`, {
                method: "POST",
                body: JSON.stringify({ text: decision }),
              });
              setDecision("");
              await onChange();
            }}
          >
            Add
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ActionsBlock({
  meeting,
  isAdmin,
  users,
  onChange,
}: {
  meeting: MeetingDetail;
  isAdmin: boolean;
  users: AppUser[];
  onChange: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const activeUsers = users.filter((item) => item.status === "active");

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold tracking-wide text-muted">ACTIONS</h2>
      {meeting.actionItems.map((item) => (
        <article key={item.id} className="space-y-2 rounded-3xl bg-card p-4">
          {isAdmin && editingId === item.id ? (
            <>
              <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
              <select value={editOwnerId} onChange={(event) => setEditOwnerId(event.target.value)}>
                <option value="">Unassigned</option>
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {displayName(user)}
                  </option>
                ))}
              </select>
              <input type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} />
              <div className="flex gap-2">
                <button
                  className="h-11 flex-1 rounded-2xl bg-accent font-medium text-accent-fg"
                  onClick={async () => {
                    if (!editTitle.trim()) return;
                    await api(`/api/actions/${item.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        title: editTitle,
                        ownerId: editOwnerId || null,
                        dueDate: editDueDate || null,
                      }),
                    });
                    setEditingId(null);
                    await onChange();
                  }}
                >
                  Save
                </button>
                <button className="h-11 rounded-2xl bg-bg px-4" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted">
                {item.ownerName || "Unassigned"}
                {item.dueDate ? ` · ${item.dueDate}` : ""}
              </p>
              {isAdmin || item.ownerId ? (
                <select
                  className="mt-3"
                  value={item.status}
                  onChange={async (event) => {
                    await api(`/api/actions/${item.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: event.target.value as ActionStatus }),
                    });
                    await onChange();
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : null}
              {isAdmin ? (
                <div className="flex gap-2 pt-1">
                  <button
                    className="h-10 flex-1 rounded-2xl bg-bg text-sm"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditTitle(item.title);
                      setEditOwnerId(item.ownerId ?? "");
                      setEditDueDate(item.dueDate ?? "");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="h-10 rounded-2xl bg-bg px-4 text-sm text-danger"
                    onClick={async () => {
                      if (!confirm("Delete this action?")) return;
                      await api(`/api/actions/${item.id}`, { method: "DELETE" });
                      await onChange();
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </>
          )}
        </article>
      ))}

      {isAdmin ? (
        <form
          className="space-y-2 rounded-3xl bg-card p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) return;
            await api(`/api/meetings/${meeting.id}/actions`, {
              method: "POST",
              body: JSON.stringify({
                title,
                ownerId: ownerId || null,
                dueDate: dueDate || null,
              }),
            });
            setTitle("");
            setOwnerId("");
            setDueDate("");
            await onChange();
          }}
        >
          <input placeholder="Action" value={title} onChange={(event) => setTitle(event.target.value)} />
          <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            <option value="">Select user</option>
            {activeUsers.map((item) => (
              <option key={item.id} value={item.id}>
                {displayName(item)}
              </option>
            ))}
          </select>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <button className="h-11 w-full rounded-2xl bg-accent font-medium text-accent-fg">Add</button>
        </form>
      ) : null}
    </section>
  );
}
