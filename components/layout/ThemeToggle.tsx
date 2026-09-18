"use client";

import { useEffect, useState } from "react";

/** Dark by default; a light choice is remembered per browser. */
export function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("subs.theme", next ? "dark" : "light");
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
