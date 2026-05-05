# Contributing — SolarCalc India

Two co-owners, co-located, both using Cursor, pushing to `main`. This doc describes how we keep that working without stepping on each other.

If you're brand new to the repo, start with [`docs/onboarding.md`](docs/onboarding.md) instead — that's the day-1 reading path.

## TL;DR

- Push to `main`. Trust each other. No PRs by default.
- Before pushing: `npm run lint && npm test && npm run format:check`.
- The pre-commit hook catches the obvious stuff. The full check before push is on you.
- Touching `src/lib/calc/`, `src/lib/catalog/`, or `src/store/`? **Mention it in person before you push.**
- Conventional commit prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- AGENTS.md and `.cursor/rules/` are the source of truth for what code in this repo should look like. Both AI sessions read them. Update them when conventions change.

## Workflow

### 1. Pull first

```bash
git pull --rebase origin main
```

Always rebase, not merge. Keeps history linear and readable.

### 2. Work in small commits

- One logical change per commit. If a commit message needs the word "and", it's probably two commits.
- Conventional prefixes: `feat:` (new behaviour), `fix:` (bug), `refactor:` (no behaviour change), `docs:`, `test:`, `chore:` (build/tooling).
- The body of the commit should answer "why," not "what" — the diff shows the what.

### 3. Before pushing

The pre-commit hook runs `eslint --fix` + `prettier --write` + related tests on staged files. That catches ~80% of breakage. The rest is your responsibility:

```bash
npm run lint            # eslint .
npm test                # vitest run (must be green — 141+ tests)
npm run format:check    # prettier --check .
npm run build           # tsc -b && vite build (catches type errors the IDE missed)
```

If any of these fail, fix and re-stage. **Never** push with `--no-verify` unless you've explicitly cleared it with the other person.

### 4. Push

```bash
git push origin main
```

### 5. After pushing

If you've changed something the other person is likely working on (calc engine, stores, catalog, a route they were in), ping them. We're co-located — walk over.

## When to make an exception and use a branch + PR

Trunk-based works for two trusted co-owners on a small app. It breaks down when:

- The change is **>1 day of work** and would otherwise sit half-done on `main`.
- The change touches **>20 files** in a way that needs review.
- The change is **architectural** (new layer, new state model, new persistence shape, removing a route).
- The other person is **out and unavailable** for the day and the change is in a high-risk area (calc, stores, catalog).

In those cases:

```bash
git checkout -b feat/<short-name>
# ... work, commits ...
git push -u origin HEAD
gh pr create
```

PR review by the other person before merge. Squash on merge.

## High-risk areas — extra care

These are the files where a silent bug has the biggest blast radius. Discuss before changing, and **always** add or update tests in the same commit:

- `src/lib/calc/**` — every number the user sees comes from here.
- `src/lib/catalog/**` — material derivation; bugs here corrupt scenarios.
- `src/store/**` — persisted to user `localStorage`; schema changes need migrations.
- `src/lib/format.ts` — currency / unit formatting; touches every screen.

The auto-attached Cursor rules in `.cursor/rules/` enforce the conventions for these areas. Read them.

## Soft ownership (default reviewers)

Until trust is built, these are the default people to ping when in doubt. Not a hard rule — anyone can change anything.

| Area                                     | Default reviewer       |
| ---------------------------------------- | ---------------------- |
| `src/lib/calc/`, `src/lib/catalog/`      | Domain expert (TBD)    |
| `src/components/`, `src/routes/`, design | App lead (TBD)         |
| `src/store/`                             | Either — discuss first |
| `docs/`                                  | Author owns it         |

Update the names above once roles settle.

## Code style

- TypeScript strict. No `any` without a one-line `// reason` comment.
- ESLint flat config in [`eslint.config.js`](eslint.config.js). Don't disable rules without a comment + follow-up issue.
- Prettier is the formatter. Don't argue with it; configure it once if needed.
- File names: `kebab-case.ts` for non-component files, `PascalCase.tsx` for components.
- Tests live next to source: `foo.ts` → `foo.test.ts`.
- Imports: absolute `@/...` aliases for `src/` paths; relative imports only within the same folder.

## Working with AI (Cursor / others)

- Both `AGENTS.md` (root) and `.cursor/rules/*.mdc` are loaded automatically by Cursor. They encode our conventions so two AI sessions produce consistent code.
- If you find yourself overriding the AI on the same convention twice in a week, **add it to the rules** instead of overriding it a third time.
- Never commit AI-generated code you haven't read line-by-line. The conventions in `AGENTS.md` are minimums, not ceilings.
- When the AI writes a test, run it. When the AI writes calc logic, run the whole `vitest` suite, not just the new test.

## Releases / deployment

Not set up yet. Local-only for now. When we add hosting (week 2), this section gets a runbook.

## Issues

GitHub Issues, with these labels:

- `domain` — solar/finance/regulatory correctness
- `calc` — finance engine
- `catalog` — BOM / material catalog
- `ui` — components, routes, design
- `infra` — build, CI, deploy, tooling
- `docs` — README, architecture, design, onboarding
- `bug` — something is broken
- `good-first-issue` — small, well-scoped, useful for warming up in a new area

Project board: Backlog → This Week → In Progress → Done.

## Decisions

For anything that affects more than one area (a new dependency, a new architectural layer, dropping a feature, changing a constant in `src/lib/calc/`), write a short note in `docs/decisions/YYYY-MM-DD-<slug>.md`. Two paragraphs is enough. Future-us will thank present-us.

## Questions

We're in the same room. Ask.
