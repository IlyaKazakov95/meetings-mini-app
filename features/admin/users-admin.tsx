"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { useAuth } from "@/components/providers/auth-provider";
import { displayName } from "@/lib/utils";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import type { AppUser, UserRole } from "@/types/domain";

export function UsersAdmin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const data = await api<{ users: AppUser[] }>("/api/users");
    setUsers(data.users);
  }

  useEffect(() => {
    reload().catch((loadError: Error) => setError(loadError.message));
  }, []);

  const pending = useMemo(() => (users ?? []).filter((item) => item.status === "pending"), [users]);
  const members = useMemo(() => (users ?? []).filter((item) => item.status !== "pending"), [users]);

  if (error) return <ErrorState message={error} />;
  if (!users) return <LoadingState />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Users</h1>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted">ACCESS REQUESTS</h2>
        {pending.length === 0 ? <EmptyState title="No requests" text="New people will appear here." /> : null}
        {pending.map((user) => (
          <div key={user.id} className="rounded-3xl bg-card p-4">
            <p className="font-medium">{displayName(user)}</p>
            <p className="text-sm text-muted">{user.telegramUsername ? `@${user.telegramUsername}` : user.telegramId}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="h-11 rounded-2xl bg-accent font-medium text-accent-fg disabled:opacity-40"
                disabled={busyId === user.id}
                onClick={async () => {
                  setBusyId(user.id);
                  try {
                    await api(`/api/users/${user.id}/access`, {
                      method: "POST",
                      body: JSON.stringify({ action: "approve" }),
                    });
                    await reload();
                  } catch (actionError) {
                    setError(actionError instanceof Error ? actionError.message : "Failed");
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Approve
              </button>
              <button
                className="h-11 rounded-2xl bg-bg font-medium text-danger disabled:opacity-40"
                disabled={busyId === user.id}
                onClick={async () => {
                  setBusyId(user.id);
                  try {
                    await api(`/api/users/${user.id}/access`, {
                      method: "POST",
                      body: JSON.stringify({ action: "reject" }),
                    });
                    await reload();
                  } catch (actionError) {
                    setError(actionError instanceof Error ? actionError.message : "Failed");
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted">MEMBERS</h2>
        {members.length === 0 ? <EmptyState title="No members" /> : null}
        <div className="space-y-3">
          {members.map((user) => (
            <div key={user.id} className="space-y-3 rounded-3xl bg-card p-4">
              <div>
                <p className="break-words font-medium">{displayName(user)}</p>
                <p className="break-all text-sm text-muted">
                  {user.telegramUsername ? `@${user.telegramUsername}` : user.telegramId}
                  {user.status === "rejected" ? " · rejected" : ""}
                  {user.id === currentUser.id ? " · you" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user.status === "active" ? (
                  <select
                    className="min-w-0 flex-1"
                    value={user.role}
                    disabled={busyId === user.id}
                    onChange={async (event) => {
                      setBusyId(user.id);
                      try {
                        await api(`/api/users/${user.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ role: event.target.value as UserRole }),
                        });
                        await reload();
                      } catch (updateError) {
                        setError(updateError instanceof Error ? updateError.message : "Update failed");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                ) : (
                  <button
                    className="h-11 flex-1 rounded-2xl bg-bg text-sm text-accent"
                    disabled={busyId === user.id}
                    onClick={async () => {
                      setBusyId(user.id);
                      try {
                        await api(`/api/users/${user.id}/access`, {
                          method: "POST",
                          body: JSON.stringify({ action: "approve" }),
                        });
                        await reload();
                      } catch (actionError) {
                        setError(actionError instanceof Error ? actionError.message : "Failed");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Approve
                  </button>
                )}
                {user.id !== currentUser.id ? (
                  <button
                    className="h-11 shrink-0 rounded-2xl bg-bg px-4 text-sm text-danger disabled:opacity-40"
                    disabled={busyId === user.id}
                    onClick={async () => {
                      if (!confirm(`Delete ${displayName(user)} from the app? This cannot be undone.`)) {
                        return;
                      }
                      setBusyId(user.id);
                      try {
                        await api(`/api/users/${user.id}`, { method: "DELETE" });
                        await reload();
                      } catch (deleteError) {
                        setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
