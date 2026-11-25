# Contributing

Thanks for helping. This app lets subscribers authorize recurring payments on Stellar, so a few rules matter more here than in a typical web app. Read the [non-negotiable rule](#the-rule-the-ui-must-never-break) before you touch any copy or logic that involves money.

## Setup

Requirements: Node.js 20 or newer (see `engines` in `package.json`) and npm. The lockfile is `package-lock.json`, so use npm, not yarn or pnpm.

```bash
git clone https://github.com/stellar-sub/stellar-subscriptions-web.git
cd stellar-subscriptions-web
npm install
cp .env.example .env.local   # optional; the defaults target Testnet
npm run dev                  # http://localhost:3000
```

`.env.example` documents every variable. Testnet works out of the box with the recorded deployment. Mainnet is not deployed yet, so leave the Mainnet contract variables empty; the app shows a "not deployed" state instead of failing. Never commit `.env` or `.env.local`; `.gitignore` already excludes them. Never put secret keys in `NEXT_PUBLIC_*` variables, because those are shipped to the browser.

To test wallet flows you need [Freighter](https://www.freighter.app/) set to the same network as the app.

## Checks that must pass

Every pull request must pass all four commands locally before you ask for review.

| Command                 | What it checks                                                       |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run typecheck`     | TypeScript (`tsc --noEmit`) across the whole project                 |
| `npm run lint`          | ESLint with `next/core-web-vitals`, plus the rule below              |
| `npm test`              | Vitest unit and component tests (`vitest run`)                       |
| `npm run validate:env`  | Checks required env vars; runs automatically as part of `npm run build` |
| `npm run check:licenses`| Audits third-party licenses against the policy below                 |
| `npm run build`         | Production build (`next build`); catches what typecheck cannot       |

ESLint rejects `TODO`, `FIXME` and `XXX` comments anywhere in the code. Put the follow-up in an issue and link it instead.

CI runs lint, typecheck, tests, the license check, and the build on every pull request.

Required environment variables are validated by `scripts/validate-env.ts` before every build. A missing `NEXT_PUBLIC_TESTNET_*` or `NEXT_PUBLIC_MAINNET_*` variable fails the build with a clear message instead of surfacing as a silent `null` at runtime.

### Bundle analysis

`npm run analyze` runs `ANALYZE=true next build`, which opens the [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer) report so you can see which dependency is responsible for a change in bundle size. Use it when a PR grows the bundle. CI uploads the report as an artifact on each run.

### License policy

`npm run check:licenses` (via `license-checker`) rejects dependencies under GPL-2.0, GPL-3.0, and LGPL-2.0, because copyleft licenses can affect distribution of this app. If a package you need falls under one of these, pick a permissively licensed alternative or raise it with the maintainers before adding the dependency.
CI runs the same checks, plus `npm run format:check` (the step is named "Check formatting") after lint. Unformatted code fails that step, so run `npm run format` before committing. See [CI and caching](#ci-and-caching) for how the workflow caches dependencies.

If you change behaviour, add or update a test next to the file you changed (`*.test.ts` or `*.test.tsx`). Money-related logic in `lib/subscription.ts` and `lib/format.ts` must stay covered.

## Code style

- TypeScript everywhere. Avoid `any`; prefer the types in `types/index.ts`.
- Use the `@/` path alias for imports from the project root, as the existing files do.
- Amounts are `bigint` in base units. Convert to display strings only at the edge, through the helpers in `lib/format.ts`. Never use floating-point numbers for money.
- Put derived facts about a subscription in `lib/subscription.ts`, computed the same way the contract computes them. Components should call those helpers rather than re-deriving the numbers.
- Components are function components with named exports. Client components start with `"use client";`.
- Styling uses Tailwind and the shared classes in `app/globals.css` (`btn-primary`, `btn-secondary`, `btn-danger`, `card`, `text-muted`). Reuse them rather than inventing new button styles.
- Keep comments short and explain why, not what. Follow the comment density of the file you are editing.
- Match the surrounding naming and structure. Don't reformat unrelated code.
- Run `npm run format` before committing. CI runs `npm run format:check` and fails on unformatted code.

## CI and caching

The workflow in `.github/workflows/ci.yml` caches npm dependencies with `actions/setup-node` (`cache: npm`). The cache key is derived from the hash of `package-lock.json`, so any lockfile change invalidates the cache and the next run does a fresh `npm install`. That means you should commit `package-lock.json` whenever dependencies change; otherwise CI may reuse stale `node_modules` and behave differently from your machine.

## Plan cache invalidation

Plans are cached in `PLAN_CACHE`. Any write that creates or deactivates a plan must call `invalidatePlans` afterwards, or the UI will keep showing stale plan data. See the JSDoc on `invalidatePlans` in [`hooks/usePlans.ts`](hooks/usePlans.ts) for the full list of operations that must call it.

## The rule: the UI must never break

**The app must never imply that a merchant can charge more than the cap, or charge off schedule.** The subscription contract enforces both limits:

- Total charges can never exceed the cap the subscriber authorized.
- A merchant can charge at most once per interval, and only when the interval has elapsed.

The website is a view over the contract, not the enforcer. If the copy says anything looser than the contract, it is a bug, even when the code is correct. Examples of wording that is **not** allowed:

- "Unlimited", "no limit", or "charged as needed" when a cap applies.
- "Charged monthly" when the contract allows at most one charge per period. Say "at most once per period".
- Any figure for "remaining" or "left to charge" that could exceed what the contract will allow. Use the helpers in `lib/subscription.ts`, which drop any leftover smaller than one period.
- Promising an exact charge date. The contract counts ledgers, which close about every 5 seconds, so times are estimates and should be labelled that way.

## Checklist for UI that moves money

Use this checklist in your PR description for any change that starts, changes, pauses, resumes, cancels, or displays a payment or authorization. Tick each item or explain why it does not apply.

### Authorization clarity

- [ ] Before the wallet prompt, the screen states the amount per charge, the interval, the total cap, the merchant, and the token. `AuthorizationSummary` is the reference.
- [ ] The confirm button is not shown until that summary is on screen.
- [ ] The screen says what the wallet signature authorizes, including that Freighter will ask the subscriber to approve spending up to the cap.
- [ ] Any amount the cap cannot cover (the remainder smaller than one period) is explained rather than silently hidden.
- [ ] Fees are described as small network fees, not as zero and not as part of the charge.

### Visible pause and cancel

- [ ] Pause or resume is visible on every live subscription, one click from the card, not behind a menu.
- [ ] Cancel is visible on every live subscription, one click from the card, not behind a menu.
- [ ] Cancel asks for a second, explicit confirmation that says cancellation is final and that no further charges can occur.
- [ ] After pause, the copy says charges stop until resume. After cancel, it says no further charges can occur, not now, not later, not by the merchant.
- [ ] The state shown after an action comes from the chain (a refetch or a confirmed transaction), not from an optimistic guess.

### Truthful wording

- [ ] Every number on screen is derived from contract data through the shared helpers, and matches what the contract will allow.
- [ ] No copy says "unlimited", "guaranteed", "instant", or "exact" about a charge, date, or limit unless the contract makes that true.
- [ ] Time estimates are labelled as estimates.
- [ ] Refund wording is accurate. Cancelling does not refund what was already charged, and the UI says so where a cancel is offered.
- [ ] Errors state what did not happen. A failed transaction must not read as a success, and a pending one must not read as final.
- [ ] Network state is visible: the Testnet or Mainnet choice, and the "not deployed" state on Mainnet, are never hidden.

### Tests

- [ ] Changed money logic has a unit test in `lib/`.
- [ ] Changed money UI has a component test that checks the rendered wording for the cap and the schedule.

## Versioning policy

The project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (`MAJOR.MINOR.PATCH`). Every release is recorded in [`CHANGELOG.md`](CHANGELOG.md), which uses the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

- **MAJOR** — breaking changes. Anything that would force a user, integrator, or deployment to change how they use the app or its contract bindings: a changed contract interface, a renamed or removed environment variable, a changed meaning of a stored value, or a removed feature.
- **MINOR** — backwards-compatible features. New screens, new helpers, new optional configuration.
- **PATCH** — backwards-compatible fixes. Bug fixes, copy corrections, dependency bumps that change no behaviour.

### Changelog entries

Every PR that changes behaviour adds an entry under `## [Unreleased]` in `CHANGELOG.md`, in the matching section (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`). PRs that only touch docs, tests, or formatting do not need an entry. Write the entry for the reader of the release notes, not for the reviewer of the diff.

### Marking breaking changes

If your PR contains a breaking change:

1. Title it with a `!` after the type, for example `feat!: rename NEXT_PUBLIC_CONTRACT_ID`.
2. Add a `BREAKING CHANGE:` footer to the commit body that says what breaks and what to do instead.
3. Put the entry under `### Changed` or `### Removed` in `## [Unreleased]` and start it with **BREAKING:**.
4. Call it out in the PR description so the maintainer can pick the next MAJOR version.

Maintainers move `## [Unreleased]` entries into a new version heading when they cut a release, and tag the commit with the matching version.

## Pull requests

1. Branch from `main`. Use a short name that says what changes.
2. Keep one concern per PR. Don't mix refactors with behaviour changes.
3. Run the four checks above and make sure they pass.
4. Describe what changed and why. For money-moving UI, include the checklist above.
5. Attach screenshots at phone and laptop widths for any visible change.
6. Add a `CHANGELOG.md` entry under `## [Unreleased]` if the PR changes behaviour, and flag breaking changes as described in the [versioning policy](#versioning-policy).

## Reporting security issues

Do not open a public issue for a vulnerability that could move someone's funds or expose their keys. Report it privately to the maintainers of the stellar-sub organization instead.
