"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { displayName } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/ui/states";
import type { AppUser, UserRole } from "@/types/domain";

export function UsersAdmin() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const data = await api<{ users: AppUser[] }>("/api/users");
    setUsers(data.users);
  }

  useEffect(() => {
    reload().catch((loadError: Error) => setError(loadError.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (users.length === 0) return <LoadingState />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="overflow-hidden rounded-3xl bg-card">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
            <div>
              <p className="font-medium">{displayName(user)}</p>
              <p className="text-sm text-muted">{user.telegramUsername ? `@${user.telegramUsername}` : user.telegramId}</p>
            </div>
            <select
              className="w-28"
              value={user.role}
              onChange={async (event) => {
                await api(`/api/users/${user.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ role: event.target.value as UserRole }),
                });
                await reload();
              }}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
