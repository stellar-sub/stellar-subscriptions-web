# Visual regression baselines

`visual.spec.ts` screenshots three screens (landing, plan detail, My
subscriptions) in dark and light at a phone (390px) and a desktop (1280px)
width: 12 images in `__snapshots__/`. A change that moves more than 1% of a
page's pixels fails the test.

All data comes from `support/fixtures.ts`. The Soroban RPC and Freighter are
faked, and any other request that leaves localhost is blocked, so a run does
not depend on the network or on the date.

## Running

```bash
npm run test:visual          # compare against the baselines
npm run test:visual:update   # re-render the baselines
```

Baselines are rendered on Linux, in the Playwright container that the
`Visual regression` workflow uses. The same page renders slightly differently
on macOS and Windows, so run the tests there through Docker:

```bash
docker run --rm --ipc=host -v "$PWD":/work -v subs-node-modules:/work/node_modules \
  -v subs-next:/work/.next -w /work mcr.microsoft.com/playwright:v1.63.0-noble \
  bash -c "npm ci && CI=1 npx playwright test"
```

## When a screen changes on purpose

1. Open the failed run, download the `visual-report` artifact, and check the
   expected, actual and diff images.
2. Re-render the baselines: run `Visual regression` from the Actions tab with
   `update` ticked and download `visual-baselines`, or use the Docker command
   above with `--update-snapshots`.
3. Commit the changed images in `__snapshots__/` with the change that caused
   them.

The container tag in `.github/workflows/visual.yml` and in the command above
must equal the exact `@playwright/test` version in `package.json`.
