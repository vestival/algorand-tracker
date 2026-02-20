# Contributing to Strategos

Thanks for contributing to Strategos.

This repository follows a strict execution workflow to keep quality and production behavior stable.

## Scope and principles
- Product scope: Strategos is currently focused on Algorand.
- Security first: never commit secrets, keys, or private wallet data.
- Deterministic accounting: avoid changes that make historical values drift without new on-chain events.

## Required workflow (every change)
1. Open an issue first.
2. Describe root cause and proposed fix in the issue.
3. Implement the fix with tests where applicable.
4. Run quality gates locally:
   - `npm test`
   - `npm run build`
5. Update `CHANGELOG.md` with date/time and user-visible impact.
6. Commit and push to `main`.
7. Deploy to Vercel production and verify.
8. Comment in the issue with:
   - what changed
   - test/build results
   - production URL
9. Close the issue.

## Issue labels
Use one primary label:
- `bug`: incorrect behavior/regression
- `feature`: new capability
- `improvement`: UX/quality/refactor

Optional labels as needed:
- `security`, `docs`, `infra`, `test`

## Commit style
Use concise imperative commit messages.

Examples:
- `Fix portfolio history daily close alignment`
- `Add wallet analytics metric selector`
- `Harden OAuth callback session handling`

## Branching
Current default workflow pushes to `main` after passing tests/build and production deployment.

## Release notes
- Keep `CHANGELOG.md` updated under `[Unreleased]`.
- Use the release script to cut one version per UTC day when needed.

## Pull requests
If PR workflow is enabled later, PRs must include:
- linked issue
- test/build output
- deployment preview/production verification notes
