import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/providers/auth-provider";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meetings",
  description: "Team meetings, attendance, minutes and follow-up inside Telegram",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0e1621",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <TelegramProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}
