"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const items = [
  { href: "/meetings", label: "Meetings", icon: "📅" },
  { href: "/actions", label: "My Actions", icon: "✅" },
  { href: "/admin", label: "Admin", icon: "⚙️", admin: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-24">
      <main className="px-4 pt-4">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg">
          {items
            .filter((item) => !item.admin || user.role === "admin")
            .map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs",
                    active ? "text-accent" : "text-muted",
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
        </div>
      </nav>
    </div>
  );
}
