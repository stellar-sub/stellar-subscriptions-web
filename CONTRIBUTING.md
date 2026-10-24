# Contributing

## Setup

```sh
npm install
```

`npm install` also runs `prepare`, which installs the git hooks through husky.

## Pre-commit checks

Committing runs `lint-staged` on the staged `.ts`, `.tsx`, `.js` and `.jsx` files. It runs ESLint against them, and a lint error blocks the commit.

To skip the hook for a single commit, for example a work-in-progress commit you intend to fix up, use:

```sh
git commit --no-verify -m "wip: ..."
```

A skipped commit is not checked, so run `npm run lint` and `npm run typecheck` before you push it.
