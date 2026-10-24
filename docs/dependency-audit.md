# Dependency audit

CI runs `npm audit --omit=dev --audit-level=high` on every pull request and on pushes to `main`
(see `.github/workflows/audit.yml`). The job fails when a production dependency has a known
high or critical advisory. Dev-only dependencies are excluded because they do not ship to users.

## When the audit job fails

1. Read the advisory: `npm audit --omit=dev` locally shows the package, severity, and fix range.
2. Try to upgrade the vulnerable package within its semver range:
   `npm update <package>` and re-run `npm audit --omit=dev --audit-level=high`.
3. If the fix needs a major version bump, upgrade it in a separate PR and check `npm run typecheck`,
   `npm run lint`, `npm test`, and `npm run build` pass.
4. If the advisory is in a transitive dependency with no fix yet, use an `overrides` entry in
   `package.json` pointing at a patched version, and remove it once upstream releases the fix.
5. If the finding does not affect this app (for example, the vulnerable code path is never reached),
   record the reason in the PR description and get a reviewer to agree before merging. Do not
   suppress the check in the workflow to get a green build.

Never resolve a finding by weakening the audit level or removing the step.
