"use client";

import { useEffect } from "react";

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();

    const root = document.documentElement;
    const theme = webApp.themeParams;
    if (theme.bg_color) root.style.setProperty("--tg-theme-bg-color", theme.bg_color);
    if (theme.text_color) root.style.setProperty("--tg-theme-text-color", theme.text_color);
    if (theme.hint_color) root.style.setProperty("--tg-theme-hint-color", theme.hint_color);
    if (theme.button_color) root.style.setProperty("--tg-theme-button-color", theme.button_color);
    if (theme.button_text_color) root.style.setProperty("--tg-theme-button-text-color", theme.button_text_color);
    if (theme.secondary_bg_color) root.style.setProperty("--tg-theme-secondary-bg-color", theme.secondary_bg_color);
    if (theme.link_color) root.style.setProperty("--tg-theme-link-color", theme.link_color);
    if (theme.destructive_text_color) {
      root.style.setProperty("--tg-theme-destructive-text-color", theme.destructive_text_color);
    }
  }, []);

  return <>{children}</>;
}
