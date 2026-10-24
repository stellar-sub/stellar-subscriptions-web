import { expect, test, type Page } from "@playwright/test";
import { SUBSCRIBER } from "./support/fixtures";
import { installFakeFreighter } from "./support/freighter";
import { mockSorobanRpc } from "./support/rpc";

type Theme = "dark" | "light";

interface Screen {
  name: string;
  path: string;
  /** Connect the fake wallet as the fixture subscriber before loading. */
  connected: boolean;
  /** Resolves once the screen has finished loading its fixture data. */
  ready: (page: Page) => Promise<void>;
}

const SCREENS: Screen[] = [
  {
    name: "landing",
    path: "/",
    connected: false,
    ready: async (page) => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("Active right now")).toBeVisible();
      await expect(page.getByRole("status")).toHaveCount(0);
    },
  },
  {
    name: "plan-detail",
    path: "/plans/1",
    connected: false,
    ready: async (page) => {
      await expect(page.getByRole("heading", { name: "Studio monthly" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Connect wallet to subscribe" })).toBeVisible();
      await expect(page.getByText("…", { exact: true })).toHaveCount(0);
    },
  },
  {
    name: "my-subscriptions",
    path: "/subscriptions",
    connected: true,
    ready: async (page) => {
      await expect(page.getByRole("article")).toHaveCount(4);
      await expect(page.getByText("Checking the ledger…")).toHaveCount(0);
      await expect(page.getByText("…", { exact: true })).toHaveCount(0);
    },
  },
];

const THEMES: Theme[] = ["dark", "light"];

async function applyTheme(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((value) => {
    try {
      localStorage.setItem("subs.theme", value);
    } catch {
      // Storage is unavailable on about:blank; the real page still gets it.
    }
  }, theme);
}

for (const screen of SCREENS) {
  for (const theme of THEMES) {
    test(`${screen.name} in ${theme}`, async ({ page }) => {
      const unmocked = await mockSorobanRpc(page);
      await installFakeFreighter(page, { address: screen.connected ? SUBSCRIBER : null });
      await applyTheme(page, theme);

      await page.goto(screen.path);
      await screen.ready(page);

      // The saved theme is applied once React has hydrated.
      const html = page.locator("html");
      if (theme === "dark") await expect(html).toHaveClass(/\bdark\b/);
      else await expect(html).not.toHaveClass(/\bdark\b/);
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${screen.name}-${theme}.png`, { fullPage: true });
      expect(unmocked, "every contract read should be answered by a fixture").toEqual([]);
    });
  }
}
