# Onboarding — SolarCalc India

Welcome. This is the day-1 reading path. The goal: by lunch you can read this codebase fluently, by end of day 2 you've shipped a small change, by end of week 1 you've picked your first real area of focus.

We're a two-person team, co-located, both using Cursor. Push to `main` directly. The structural docs ([`AGENTS.md`](../AGENTS.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md), `.cursor/rules/`) explain how we keep that working.

## Setup (10 min)

```bash
git clone https://github.com/harshajasti92/solar.git
cd solar
nvm use            # if you use nvm; otherwise Node 20+ is fine
npm install        # also installs husky git hooks via the prepare script
npm run dev        # http://localhost:5173
```

Verify everything is green before you change anything:

```bash
npm run lint       # 0 errors expected (some warnings ok)
npm test           # 141+ passing
npm run build      # tsc + vite build, no errors
```

If any of those fail on a fresh clone, that's a bug — flag it.

## Reading path — day 1 morning (~3.5 hours)

Read these in this order. Don't jump ahead — each one assumes the last.

### 1. The map (15 min)

- [`README.md`](../README.md) — what the app is, the stack, the source layout, the one-paragraph architecture diagram.

### 2. The product (30 min)

- [`docs/prd.md`](prd.md) — what we're building and why. Read for the user model and feature scope, not implementation.
- Skim [`docs/Solar Open Access in Telangana (3).pdf`](Solar%20Open%20Access%20in%20Telangana%20%283%29.pdf) — the regulatory context for the calc assumptions.

### 3. The architecture (30 min)

- [`docs/architecture.md`](architecture.md) — data flow (catalog + BOM → Materials → Scenario → ComputedResults), override flags (`manualOverrides.materials` and `manualOverrides.defaults`), what-if overrides, calc engine module map, catalog migration story.

This is the most important doc. Re-read §"Override flags" twice — it's the easiest thing to break.

### 4. The visual contract (20 min)

- [`docs/design.md`](design.md) — tokens (colour, type, spacing, radius, shadow, motion), chart system, component patterns. You don't need to memorise it; you need to know it exists and to consult it before any UI work.

### 5. The calc engine (60 min)

Open `src/lib/calc/` and walk through it in this order:

1. `index.ts` — the public surface
2. `compute.ts` — `computeScenario` is the entry point everything else feeds into
3. `energy.ts`, `om.ts`, `capex.ts` — the inputs to cash flow
4. `loan.ts` — read this carefully; grace-period + extra-principal + auto-absorb logic is subtle
5. `cashflow.ts` — `npv`, `irr` (Newton-Raphson + bisection fallback)
6. `payback.ts`, `co2.ts` — small, self-contained
7. `index.test.ts` — read the test file like a spec; it will tell you what each function actually guarantees

Run the tests in watch mode while you read:

```bash
npm run test:watch -- src/lib/calc
```

### 6. One full route, end to end (45 min)

Pick **ScenarioBuilder → Results** to see the full data flow:

1. `src/routes/EstimateBuilder/index.tsx` — how the route reads the store, derives materials, and composes subcomponents
2. `src/store/estimates.ts` — how the estimate is shaped and persisted, how `manualOverrides` work in practice
3. `src/lib/catalog/derive.ts` — how `(BOM × catalog × sizeMW)` becomes Materials
4. `src/routes/Results/index.tsx` — how the route calls `computeScenario` and feeds the dashboard
5. `src/routes/Results/usePrepaymentMax.ts` — read the comment; it's the canonical example of "calc lives in lib/, route-local hooks orchestrate it"

### 7. How we work (15 min)

- [`AGENTS.md`](../AGENTS.md) — the conventions both AI sessions follow. Skim, then keep open while coding.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — push-to-main workflow, high-risk areas, when to use a branch.
- [`.cursor/rules/`](../.cursor/rules/) — auto-attached rules that fire when you edit specific paths. Open one to see the pattern.

## Day 1 afternoon — pair + first explore

Sit together for 30 min and walk the GitHub Issues / Project board. Pick one `good-first-issue` to read (not necessarily ship today).

Then spend 2–3 hours poking at the running app:

- Build a few estimates from scratch.
- Compare two scenarios.
- Edit the BOM templates in Settings.
- Import a CSV catalog.
- Export a PDF and an Excel.
- Hit it on your phone (it's a PWA — install it).

Write down every "huh, that's weird" moment. Those are bugs or missing docs.

## Day 2 — first small change

Goal: ship one PR-shaped commit. Pick from:

- A `good-first-issue` from the board.
- A doc fix you noticed during day-1 reading.
- A small UI polish on a route you understand.
- A formatting consistency pass on a file (`lib/format.ts` users) — low risk, high learning.

Process:

1. `git pull --rebase origin main`
2. Make the change. Run `npm run lint && npm test && npm run build`.
3. Commit with a conventional prefix.
4. Push to `main`.
5. Walk over and tell the other person what you pushed.

## Week 1 — pick your focus

You're a domain expert. The single highest-leverage thing you can do in week 1 is **author `docs/domain-assumptions.md`**: a sanity audit of every assumption baked into the calc engine, against real Indian solar plant practice.

Things to check:

- `CO2_FACTOR_KG_PER_KWH = 0.82` (`src/lib/calc/co2.ts`) — current value of India CEA grid factor?
- IRR Newton-Raphson seed (`src/lib/calc/cashflow.ts`) — is `0.10` reasonable for utility-scale solar in India today?
- Default O&M %-of-CAPEX (`src/store/catalog.ts` and seed catalogs) — match industry ranges?
- Default lifespan (25y), degradation (0.5%/y), CUF, PPA escalation, discount rate — match what you see in real PPAs?
- BOM-per-MW templates in `src/lib/catalog/seedMaterialCatalog.ts` — realistic quantities and unit costs for ground-mount, rooftop, carport?
- Open-access regulatory assumptions in the Telangana PDF reflected anywhere in the calc?

Output is a doc + 2–3 small PRs fixing whatever's wrong. This is the perfect first big task because it uses your unique skill, doesn't require deep React, and immediately makes the project more correct.

## Where to ask

We're in the same room. Ask before guessing on:

- Product behaviour (what should happen when…?)
- Anything in `src/lib/calc/`, `src/lib/catalog/`, or `src/store/`.
- Any change to `docs/design.md` tokens or design rules.
- Adding a new dependency.

## Cheat sheet

| Want to do…                              | Look at                                                          |
| ---------------------------------------- | ---------------------------------------------------------------- |
| Add a new financial calculation          | `src/lib/calc/` + `index.test.ts`                                |
| Add a new UI component                   | `src/components/ui/` + `docs/design.md` §10                      |
| Add a chart                              | `src/components/charts/` + `docs/design.md` §9                   |
| Add a route                              | `src/routes/<Route>/index.tsx` + wire into `src/App.tsx` and nav |
| Persist new state                        | `src/store/` — bump version + write migration                    |
| Format currency / units                  | `src/lib/format.ts` — never roll your own                        |
| Change BOM/catalog logic                 | `src/lib/catalog/derive.ts` + `derive.test.ts`                   |
| Find where a number on screen comes from | search for the formatter call → trace back through `compute.ts`  |
