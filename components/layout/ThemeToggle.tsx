"use client";

import { useEffect, useState } from "react";

export const THEME_KEY = "subs.theme";

function storedTheme(): "light" | "dark" | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Dark by default; a light choice is remembered per browser.
 *
 * The inline script in the root layout applies a saved choice before first
 * paint, but React restores the server-rendered `dark` class when it hydrates
 * `<html>`, so the saved choice is applied again here once hydration is done.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = storedTheme();
    if (saved) document.documentElement.classList.toggle("dark", saved === "dark");
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // Private browsing can block storage; the choice then lasts for this page only.
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-secondary px-3"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      <span aria-hidden>{dark ? "☀" : "☾"}</span>
    </button>
  );
}
