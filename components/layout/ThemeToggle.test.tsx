import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { THEME_KEY, ThemeToggle } from "./ThemeToggle";

const root = document.documentElement;

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    root.classList.add("dark");
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
});
