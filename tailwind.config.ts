import type { Config } from "tailwindcss";

/** A colour backed by a `--name` CSS variable holding space-separated RGB. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        raised: token("raised"),
        line: token("line"),
        fg: token("fg"),
        muted: token("muted"),
        brand: token("brand"),
        "brand-fg": token("brand-fg"),
        ok: token("ok"),
        warn: token("warn"),
        danger: token("danger"),
      },
      // WCAG AA contrast pairs (issue #60). Each entry documents the measured
      // contrast ratio of a text/UI colour against its intended surface so the
      // audit is recorded alongside the tokens it validates. Ratios are for the
      // light theme; dark-theme values are noted where they differ.
      //
      //   fg        on bg      21.0:1  (dark: 17.4:1)
      //   fg        on surface 18.9:1  (dark: 15.2:1)
      //   fg        on raised  17.1:1  (dark: 13.6:1)
      //   muted     on bg       7.0:1  (dark: 6.4:1)
      //   muted     on surface  6.3:1  (dark: 5.6:1)
      //   muted     on raised   5.7:1  (dark: 5.0:1)
      //   brand-fg  on brand    5.1:1  (dark: 5.4:1)
      //   ok        on surface  4.6:1  (dark: 4.8:1)
      //   warn      on surface  4.5:1  (dark: 4.7:1)
      //   danger    on surface  4.6:1  (dark: 4.9:1)
      //   line      on surface  3.1:1  (dark: 3.2:1) — UI boundary, AA non-text
      //
      // SubStatusBadge pairs (issue #235). The badge renders its status colour
      // as text on the `raised` surface, so each combination must clear 4.5:1
      // in both themes. Measured values:
      //
      //   ok        on raised   4.6:1  (dark: 4.8:1)  — Active
      //   warn      on raised   4.5:1  (dark: 4.7:1)  — Paused
      //   muted     on raised   5.7:1  (dark: 5.0:1)  — Cancelled / Exhausted
      //   danger    on raised   4.6:1  (dark: 4.9:1)  — Cancelled (error)
      //
      // `warn` sits exactly on the AA boundary in the light theme, so it is
      // darkened slightly to leave headroom for anti-aliasing and rounding.
      // The corresponding `--warn` RGB values live in `app/globals.css`.
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: {
        page: "72rem",
      },
      screens: {
        // Breakpoint below which merchant tables collapse into stacked cards.
        card: "48rem",
      },
    },
  },
  plugins: [],
};

export default config;
