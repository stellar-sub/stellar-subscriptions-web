# End-to-end tests (Playwright + mocked Freighter)

These tests exercise the real user journeys in a browser while stubbing the
wallet and the Soroban RPC. Real wallet signing cannot run in CI, so the
Freighter extension is replaced by a fake `window` wallet API and RPC calls are
answered from recorded fixtures.

## Layout

```
e2e/
  playwright.config.ts   Playwright config (webServer runs `npm run dev`)
  fixtures/
    wallet.ts            Fake Freighter `window` API (reusable)
    rpc.ts               Recorded RPC responses for plan browsing
  tests/
    browse-plans.spec.ts     Browse plans journey
    subscribe-cancel.spec.ts Subscribe then cancel journey
```

## The fake wallet

`fixtures/wallet.ts` installs a stub on `window` before the app boots so the
app's Freighter integration resolves without the real extension. It is
reusable across specs:

```ts
import { test, expect } from '@playwright/test';
import { installFakeWallet } from '../fixtures/wallet';

test.beforeEach(async ({ page }) => {
  await installFakeWallet(page, { publicKey: 'G...' });
});
```

- `installFakeWallet(page, options)` adds the fake API via `addInitScript` so it
  is present on every navigation.
- `options.publicKey` sets the connected account; omit it to simulate a
  disconnected wallet.
- `options.rejectSigning` makes `signTransaction` reject, to cover the
  user-declined path.

## Recorded RPC data

`fixtures/rpc.ts` exposes recorded responses (plan list, subscription state)
that are served through `page.route` so the journeys run deterministically and
offline.

## Running

```bash
npx playwright install --with-deps
npx playwright test
```

Both journeys run in CI via `.github/workflows/e2e.yml`.

## Truthfulness note

Subscriptions are capped and billed on schedule by the contract. The UI and
these tests assert that a merchant can never charge above the cap or off
schedule.
