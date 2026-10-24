import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { THEME_KEY, ThemeToggle } from "./ThemeToggle";

const root = document.documentElement;

function mockPrefersDark(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
  };
  window.matchMedia = jest.fn().mockReturnValue(mql);
  return {
    setMatches(next: boolean) {
      mql.matches = next;
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent));
    },
  };
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    root.classList.add("dark");
    mockPrefersDark(true);
  });

  it("stays dark when nothing is saved, and saves nothing", () => {
    render(<ThemeToggle />);
    expect(root).toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("re-applies a saved light choice after hydration puts the dark class back", () => {
    localStorage.setItem(THEME_KEY, "light");
    render(<ThemeToggle />);
    expect(root).not.toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("saves the choice when toggled, both ways", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(root).not.toHaveClass("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(root).toHaveClass("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("ignores an unrecognised saved value", () => {
    localStorage.setItem(THEME_KEY, "purple");
    render(<ThemeToggle />);
    expect(root).toHaveClass("dark");
  });

  it("offers a system option that follows the OS without reload", async () => {
    const media = mockPrefersDark(false);
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Use system theme" }));
    expect(localStorage.getItem(THEME_KEY)).toBe("system");
    expect(root).not.toHaveClass("dark");

    act(() => media.setMatches(true));
    expect(root).toHaveClass("dark");

    act(() => media.setMatches(false));
    expect(root).not.toHaveClass("dark");
  });

  it("honours a saved system choice after hydration", () => {
    localStorage.setItem(THEME_KEY, "system");
    mockPrefersDark(false);
    render(<ThemeToggle />);
    expect(root).not.toHaveClass("dark");
  });
});
