"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "subs.theme";

type ThemeChoice = "light" | "dark" | "system";

function storedTheme(): ThemeChoice | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(choice: ThemeChoice) {
  const dark = choice === "system" ? systemPrefersDark() : choice === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Dark by default; a light, dark, or system choice is remembered per browser.
 *
 * The inline script in the root layout applies a saved choice before first
 * paint, but React restores the server-rendered `dark` class when it hydrates
 * `<html>`, so the saved choice is applied again here once hydration is done.
 * The `system` choice follows `prefers-color-scheme` and updates live.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("dark");

  useEffect(() => {
    const saved = storedTheme() ?? "dark";
    applyTheme(saved);
    setChoice(saved);
  }, []);

  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  function select(next: ThemeChoice) {
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private browsing can block storage; the choice then lasts for this page only.
    }
    setChoice(next);
  }

  const dark = choice === "system" ? systemPrefersDark() : choice === "dark";

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => select("light")}
        className="btn-secondary px-3"
        aria-pressed={choice === "light"}
        aria-label="Light theme"
        title="Light theme"
      >
        <span aria-hidden>☀</span>
      </button>
      <button
        type="button"
        onClick={() => select("dark")}
        className="btn-secondary px-3"
        aria-pressed={choice === "dark"}
        aria-label="Dark theme"
        title="Dark theme"
      >
        <span aria-hidden>☾</span>
      </button>
      <button
        type="button"
        onClick={() => select("system")}
        className="btn-secondary px-3"
        aria-pressed={choice === "system"}
        aria-label="System theme"
        title="System theme"
      >
        <span aria-hidden>{dark ? "◐" : "◑"}</span>
      </button>
    </div>
  );
}
