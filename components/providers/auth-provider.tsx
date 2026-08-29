"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { displayName } from "@/lib/utils";
import type { AppUser } from "@/types/domain";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";

interface AuthContextValue {
  user: AppUser;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [canRequest, setCanRequest] = useState(false);
  const [demoUsers, setDemoUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const isDev = process.env.NODE_ENV === "development";
  const hasTelegram = Boolean(typeof window !== "undefined" && window.Telegram?.WebApp?.initData);

  async function loadMe() {
    const data = await api<{ user: AppUser | null; canRequest?: boolean }>("/api/auth/me");
    setUser(data.user);
    setCanRequest(Boolean(data.canRequest));
  }

  async function sendRequest() {
    setRequesting(true);
    try {
      const data = await api<{ user: AppUser }>("/api/access/request", { method: "POST" });
      setUser(data.user);
      setCanRequest(false);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed");
    } finally {
      setRequesting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await loadMe();
      } catch (bootError) {
        if (isDev) {
          try {
            const response = await fetch("/api/auth/dev-users");
            if (response.ok) {
              const data = (await response.json()) as { users: AppUser[] };
              if (!cancelled) setDemoUsers(data.users);
            }
          } catch {
            // seed may not have run yet
          }
        }
        if (!cancelled) {
          setError(bootError instanceof Error ? bootError.message : "Unauthorized");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [isDev]);

  const value = useMemo(() => (user && user.status === "active" ? { user, refresh: loadMe } : null), [user]);

  if (loading) {
    return <LoadingState label="Opening Meetings" />;
  }

  if (user?.status === "pending") {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <EmptyState
          title="Request sent"
          text="An admin will approve your access. Close the app and open it again after you are accepted."
        />
      </div>
    );
  }

  if (user?.status === "rejected") {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-10">
        <EmptyState
          title="Access declined"
          text="An admin declined your request. You can send it again."
        />
        <button
          className="h-12 w-full rounded-2xl bg-accent font-semibold text-accent-fg disabled:opacity-40"
          disabled={requesting}
          onClick={() => void sendRequest()}
        >
          {requesting ? "Sending…" : "Request access again"}
        </button>
        {error ? <p className="text-center text-sm text-danger">{error}</p> : null}
      </div>
    );
  }

  if (!user) {
    if (canRequest) {
      return (
        <div className="mx-auto max-w-md space-y-4 px-4 py-10">
          <EmptyState
            title="Access required"
            text="This Mini App is private. Send a request and wait for an admin to approve you."
          />
          <button
            className="h-12 w-full rounded-2xl bg-accent font-semibold text-accent-fg disabled:opacity-40"
            disabled={requesting}
            onClick={() => void sendRequest()}
          >
            {requesting ? "Sending…" : "Request access"}
          </button>
          {error ? <p className="text-center text-sm text-danger">{error}</p> : null}
        </div>
      );
    }

    if (isDev) {
      return (
        <div className="mx-auto max-w-md px-4 py-8">
          <h1 className="text-2xl font-semibold">Development mode</h1>
          <p className="mt-2 text-sm text-muted">
            Telegram context is missing. Choose a seeded demo user to continue locally.
          </p>
          {demoUsers.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No demo users"
                text="Create a .env.local file, run migrations in Supabase, then npm run seed."
              />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {demoUsers.map((demo) => (
                <button
                  key={demo.id}
                  className="flex w-full items-center justify-between rounded-2xl bg-card px-4 py-4 text-left"
                  onClick={async () => {
                    const data = await api<{ user: AppUser }>("/api/auth/dev-login", {
                      method: "POST",
                      body: JSON.stringify({ telegramId: demo.telegramId }),
                    });
                    setUser(data.user);
                    setError(null);
                  }}
                >
                  <span>
                    <span className="block font-medium">{displayName(demo)}</span>
                    <span className="text-sm text-muted">{demo.role}</span>
                  </span>
                  <span className="text-muted">→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-md px-4 py-10">
        {hasTelegram ? (
          <ErrorState message={error || "Unauthorized"} />
        ) : (
          <EmptyState
            title="No Telegram context"
            text="Open this Mini App from Telegram. Production does not allow browser login."
          />
        )}
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
