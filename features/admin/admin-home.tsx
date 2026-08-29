"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { EmptyState } from "@/components/ui/states";

const links = [
  { href: "/admin/import", title: "Import Schedule", text: "Upload XLSX, preview and confirm" },
  { href: "/admin/imports", title: "Import History", text: "Previous uploads and results" },
  { href: "/admin/meetings/new", title: "Create Meeting", text: "Add a meeting without Excel" },
  { href: "/admin/users", title: "Users", text: "Roles of Mini App participants" },
];

export function AdminHome() {
  const { user } = useAuth();

  if (user.role !== "admin") {
    return <EmptyState title="Unauthorized" text="Admin screens are hidden for regular users." />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="block rounded-3xl bg-card p-4">
          <h2 className="font-semibold">{link.title}</h2>
          <p className="mt-1 text-sm text-muted">{link.text}</p>
        </Link>
      ))}
    </div>
  );
}
