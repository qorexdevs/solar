# SolarCalc — Product Requirements Document (v1)

> **Status:** Draft, derived from PRD interview on 2026-05-04 (revised same day to add Project Configuration model).
> **Owner:** Founder
> **Supersedes:** the implicit product direction encoded in the current POC. Where this PRD conflicts with the existing implementation, this PRD wins; the team explicitly accepts that some parts of the POC may be rebuilt to match.
> **Related:**
>
> - [`AGENTS.md`](../AGENTS.md) — engineering rules
> - [`docs/architecture.md`](architecture.md) — current as-built
> - [`docs/design.md`](design.md) — visual contract
> - [`docs/Project costing details _MW.xlsx`](Project%20costing%20details%20_MW.xlsx) — v1 BOM/catalog source format

---

## 1. Summary

SolarCalc is an internal mobile-first PWA for evaluating solar plant feasibility (0.25–5 MW, India, ₹). The user picks a **Project Configuration** (commercial structure, voltage level, mounting type, and so on) and inputs plant size, expenses, and funding structure; the tool derives the BOM dynamically from catalog + configuration rules and returns the financial KPIs needed to decide whether a deal is worth pursuing — IRR, LCOE, NPV, payback period, and full P&L — instantly, with sliders for fast assumption iteration.

Estimates can be saved, version-tracked, exported as PDF, compared side-by-side, and shared as files between teammates. Once an estimate is approved, a basic Power Purchase Agreement (PPA) draft can be generated from it.

It exists so a small EPC/development team stops doing feasibility in scattered Excel sheets and starts making the same decision the same way, with the same numbers, every time.

---

## 2. Problem

Today, every deal discussion involves multiple Excel files: someone's BOM costing, someone else's financial model, a third sheet tracking PPA assumptions. They live on individual laptops, drift out of date, and rarely sit next to each other. The result:

- **No single source of truth.** Two team members can run the same deal and get different IRRs because they used different assumptions, different cost rows, or a stale supplier price.
- **Iteration is slow.** Changing the plant size, the configuration (e.g. captive → open access), or the PPA rate means editing formulas in three places and praying the linkages still hold.
- **BOM costs go stale.** No one owns the catalog, so prices drift; quotes are often skewed to a single supplier the analyst happened to have data from.
- **Configurations live in heads, not models.** The mental rule "for HT we need bigger transformers and more cable" lives in the analyst's head, not in any spreadsheet — so a new analyst gets it wrong.
- **Decisions sometimes aren't data-driven** — feasibility ends up being an opinion call because the model wasn't ready in time for the meeting.

**Headline problem:** we don't have a single place where current material costs, project-configuration logic, and financial modeling sit side-by-side, so deals get evaluated inconsistently and slowly.

---

## 3. Users

A small internal team. Three roles, all comfortable with the underlying finance and engineering vocabulary (IRR, LCOE, NPV, payback, CUF, degradation, PPA escalation, O&M %).

| Role                  | What they do in SolarCalc                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Founder**           | Reviews estimates in client meetings and on the go (mobile); decides whether to pursue.        |
| **Financial Analyst** | Builds and refines estimates; iterates on assumptions; owns and maintains the catalog & rules. |
| **EPC Engineer**      | Validates BOM/material assumptions; builds estimates from a technical-first angle.             |

**Pre-build dependency — Configuration workshop.** Before catalog and rules data is finalised, the founder will sit with a domain expert and produce a one-time canonical list of configuration axes, their options, and the rules that map configurations to BOM materials. This list becomes the v1 seed; in-app editing of axes/options is **not** in v1 (see §6 and §11).

**Usage contexts:** office laptop while reviewing a deal; phone during a site visit; client meeting (likely shown on phone or tablet). All three contexts use the same routes, same data, same store — no functionality gated to desktop.

**Trust model:** internal-only. Outputs are not shown to investors, banks, or clients in v1; PDF exports are for internal archive plus optional sharing within the team.

---

## 4. Goals & Success Metrics

### Goals

1. **Become the source of truth.** Within 30 days of rollout, the team stops opening Excel for feasibility — every new deal discussion starts from a SolarCalc estimate.
2. **Confidence in the numbers.** Team members trust the KPIs enough to make commit/kill decisions on them. Every deal that proceeds traces back to a saved estimate.
3. **Speed of iteration.** Changing an assumption (size, configuration, PPA rate, capex line) takes seconds, not minutes; comparing two options is a single screen, not two browser tabs.
4. **Catalog & rules stay alive.** Updating supplier prices is light enough that someone actually does it weekly-to-monthly without it becoming an obvious chore.
5. **Configuration logic leaves people's heads.** New configurations apply correctly to the BOM without needing the analyst to "remember the special rules" — they're encoded.

### Success metrics (30-day post-rollout)

- ≥ 1 saved estimate per active deal under discussion.
- Excel sheets stop appearing in deal-review meetings.
- Catalog has been updated at least twice in the period (proxy for "manageable").
- No deal is approved that isn't backed by a SolarCalc estimate ID.
- Estimates exist across at least 3 distinct configurations within the first month (proxy for "the configuration model is actually being used, not bypassed").

### Failure signals (any of these → rethink)

- The catalog or rules become painful to update or scale → people stop trusting them → revert to Excel.
- The need for a dedicated financial analyst doesn't reduce (i.e. the tool is just a slow front-end to the same Excel work).
- Team continues to pull personal Excel sheets in meetings.
- Analysts override the auto-derived BOM heavily for every estimate (signal that the rules don't capture reality).

---

## 5. v1 Scope — Must-Have Features

All nine features below are committed for v1. None are deferred.

### 5.1 Estimate Builder

Users pick a configuration, input plant parameters, and get instant financial KPIs.

**Inputs (in roughly this order in the UI):**

- **Project Configuration** (see §5.9) — one selection per configured axis (e.g. commercial structure, voltage level, mounting type). Drives BOM derivation.
- Plant size (MW, 0.25–5 MW range)
- Capex — derived BOM + non-BOM costs; defaults flow from catalog × configuration rules × size; line-by-line override available
- Funding mix (equity / debt split, interest rate, tenure)
- Financial assumptions: lifespan, degradation, inflation, discount rate, CUF, PPA rate, PPA escalation, O&M %

**Outputs:**

- IRR (project & equity)
- LCOE (₹/kWh)
- NPV (₹)
- Payback period (years)
- Full P&L table (year-by-year)
- Cash flow chart
- CO₂ avoided (tonnes, lifetime; CEA factor 0.82 kg/kWh)

**Acceptance:** Updating any input recomputes all KPIs in <100 ms; no "Recalculate" button. Changing the configuration triggers BOM re-derivation (with confirmation if overrides exist — see §5.9).

### 5.2 Fast Assumption Iteration

Sliders, steppers, and direct inputs for every assumption listed in 5.1. Live recompute on every change. Visual feedback (chart/KPI updates) in the same frame. No modal "are you sure" interruptions, except for the one explicit configuration-change reset (§5.9).

**Acceptance:** Changing PPA rate from 3.5 to 4.0 ₹/kWh updates IRR / NPV / payback visibly within the same render frame.

### 5.3 Side-by-Side Comparison

Pick 2+ estimates from the user's local library and compare:

- Side-by-side KPI strip (IRR, LCOE, NPV, payback, total capex, ₹/MW)
- Overlay charts (cash-flow lines on one axis; cumulative cash on a second chart)
- Diff view of inputs that differ between estimates — **including configuration differences, surfaced prominently** (e.g. "this estimate is HT, that one is LT")
- Diff view of derived BOM lines that differ between estimates

Comparison works across **all estimates in the user's browser** — own + imported from teammates, regardless of configuration.

**Acceptance:** From the estimate list, select 2+ checkboxes → "Compare" → comparison view loads in <500 ms; mobile shows comparison as horizontally scrollable cards with sticky labels. Configuration differences are visible at a glance.

### 5.4 Shared Visibility (via Sharing, Not Sync)

The team is local-first; there is no backend in v1. "Shared visibility" is achieved through explicit sharing:

- **Export estimate**: any saved estimate can be exported to a portable file (e.g. JSON) and as a PDF.
- **Share via file or email**: the exported file can be sent by any external channel (email, WhatsApp, Drive, file system).
- **Import**: recipient imports the file into their own SolarCalc; the imported estimate appears in their library.
- **Provenance preserved**: imported estimates retain the original author's name and an "imported from [name] on [date]" tag. The recipient can fork/edit; original-author and import-source remain visible.

**Acceptance:** A teammate can export → send → import an estimate in under 60 seconds, and the imported estimate is immediately available for comparison alongside the recipient's own estimates — even if recipient's catalog or rules differ (the share payload carries the snapshot used; see §8).

### 5.5 Material Cost Catalog & Rules

A central, manually-maintained BOM/cost catalog **plus a configuration-rules layer** that together drive capex defaults in the estimate builder.

**Catalog (the "what costs what" table):**

- One row per material identity (e.g. `dc_cable`, `transformer`, `pile_foundation`, `module_mounting_structure`).
- Each row: material id, label, unit, unit cost (₹), notes, last-updated date.
- **Single supplier per row** in v1. (Multi-supplier comparison is explicitly out — see §6.)
- Source-of-truth seed: [`docs/Project costing details _MW.xlsx`](Project%20costing%20details%20_MW.xlsx) (or its evolved equivalent).
- Maintained by the team (likely the Financial Analyst), via an in-app catalog editor and/or re-import from an updated Excel file.
- Refresh cadence: weekly to monthly, manual.

**Rules layer (the "what to include when" table):**

- See §5.9 for the full model. In short: each rule has a `when` clause matching configuration values and an action — `add material X with quantity Y per MW`, or `multiply unit cost of material X by factor F`.
- The rules layer is data, not code. It lives in the catalog store and is editable by the same people who edit catalog rows. (Editing axes/options themselves is hardcoded for v1; see §6.)

**Override mechanism:** when the catalog or rules update, **existing estimates do not silently change** — they keep the costs and BOM they were saved with (snapshot per estimate). New estimates pick up the new defaults. (This matches the existing `manualOverrides` pattern in the POC; carry it forward and extend it to cover rule-driven derivations.)

**Acceptance:** A user can update one BOM line price in the catalog, create a new estimate, and see the new price flow into capex automatically — without disturbing any saved estimate. Same applies to rule edits.

### 5.6 PDF Export

Every saved estimate can be exported to a presentable, printable PDF for archive and sharing.

**Contents (minimum):**

- Header: estimate name, author, date, version
- Configuration summary (the selected axis values)
- Inputs summary (plant size, funding, key assumptions)
- KPI summary (IRR, LCOE, NPV, payback, CO₂)
- Capex breakdown (derived BOM + non-BOM, with override markers where applicable)
- Year-by-year P&L table
- Cash flow chart
- Footer: "Generated by SolarCalc", estimate ID

**Acceptance:** PDF renders cleanly on A4, looks professional enough that the founder is comfortable filing it as the deal record.

### 5.7 Basic PPA Generation

Once an estimate is approved internally, the user can generate a basic Power Purchase Agreement draft from it.

**v1 scope:** template-merge only. A standard PPA template (provided/finalised by the founder; see §10 Q2) with merge fields filled from the source estimate (parties, plant size, location, configuration, PPA rate, escalation, tenure, COD assumptions, etc.). Output as PDF (and editable format if feasible — see §10 Q5).

**Explicitly NOT in v1:** clause negotiation UI, e-signature, redlining, multi-party review, version-controlled legal collaboration. (See §6.)

**Acceptance:** From a saved estimate, a user clicks "Generate PPA" → a draft PPA is produced with the estimate's key terms merged in, ready for manual review and editing outside the tool.

### 5.8 Version History (per estimate)

Each estimate tracks its edit history locally so users can see how an estimate evolved.

- Every save creates a new version (with timestamp and editor name).
- Configuration changes that trigger a BOM reset (§5.9) create a version automatically before the reset, so the previous BOM and overrides are recoverable.
- Users can view a version, restore it, or compare two versions of the same estimate using the same diff UI as §5.3.
- History is per-browser (consistent with the local-first model); imported estimates start fresh history at import (the original author's pre-import history is not transferred).

**Acceptance:** Editing an estimate, saving, then viewing history shows both the previous and the current version with a visible diff of what changed — including configuration changes.

### 5.9 Project Configuration & Dynamic BOM

This is the keystone feature that ties the estimate builder, catalog, and rules layer together. **Read this section before designing any of §5.1, §5.5, or §8.**

#### 5.9.1 Concepts

- **Axis** — an independent dimension of project shape. Examples: `commercial_structure`, `voltage_level`, `mounting_type`. Axes are **orthogonal**: any combination of axis values is a valid configuration.
- **Option** — one of the values an axis can take. Examples for `voltage_level`: `LT`, `HT`. For `commercial_structure`: `Captive`, `Open Access`, `Group Captive`.
- **Configuration** — a complete set `{axis_id: option_id}` selected on an estimate. Every estimate has exactly one configuration.
- **Material** — a normalised identity for a thing that costs money. Examples: `dc_cable`, `transformer`, `pile_foundation`. A material has stable units (e.g. metres, units, kg) and lives in the catalog with a unit cost.
- **Rule** — a derivation rule that maps configuration → BOM. Two flavours in v1:
  - **Add-rule:** "when configuration matches `when` clause, add material X with quantity Y per MW (or per project, see 5.9.3)."
  - **Multiply-rule:** "when configuration matches `when` clause, multiply unit cost of material X by factor F."
- **Aggregation** — after all matching rules fire, quantities of the same material identity are **summed into a single BOM line**. This is the user-flagged "cables from base + cables from LT-rule should sum, not duplicate."

#### 5.9.2 Worked example — 1 MW project, configuration = `{voltage: LT, mounting: Ground}`

```
Catalog rows (materials):
  dc_cable          unit: m       unit_cost: ₹250/m
  pile_foundation   unit: unit    unit_cost: ₹4,500/unit
  transformer       unit: unit    unit_cost: ₹6,00,000/unit

Rules:
  R1 (always):                  add  dc_cable           100 m / MW
  R2 (when voltage = LT):       add  dc_cable            50 m / MW
  R3 (when voltage = HT):       add  dc_cable            30 m / MW
  R4 (when mounting = Ground):  add  pile_foundation     40 units / MW
  R5 (when voltage = HT):       multiply transformer × 1.5

For 1 MW LT Ground, R1 + R2 + R4 fire.

Final BOM after aggregation:
  dc_cable         150 m   (100 from R1 + 50 from R2)   ₹37,500
  pile_foundation   40     (R4)                          ₹1,80,000
  transformer        1     (default qty, no rule fired,  ₹6,00,000
                            cost unchanged)
```

If voltage flipped to HT:

```
  dc_cable         130 m   (100 from R1 + 30 from R3)   ₹32,500
  pile_foundation   40     (R4 still applies)           ₹1,80,000
  transformer        1     unit, but cost × 1.5 (R5)    ₹9,00,000
```

This aggregation behaviour — **one BOM line per material identity, regardless of how many rules contributed quantities to it** — is the contract.

#### 5.9.3 Per-MW vs per-project quantities

Rules can specify quantities as either:

- **Per MW** (`quantity_per_mw`) — multiplied by plant size in derivation. Most line items.
- **Per project** (`quantity_per_project`) — fixed regardless of size. Examples: a single SCADA system, a single fence gate.

Exactly one of these is set per add-rule.

#### 5.9.4 Configuration UI

- Render one selector per axis on the builder, in a fixed display order defined by the seed data.
- Selectors are independent — picking one option never disables another (orthogonal model). If we ever encounter an invalid combination, the right answer is to add a new axis or option, not to add cross-axis dependencies.
- The current configuration is always visible at the top of the builder.

#### 5.9.5 Mid-estimate configuration change — hard reset

When a user changes any axis value on an existing estimate:

1. Show a confirm dialog: "Changing the configuration will reset the BOM and discard any line-level overrides you've made. Funding and financial assumptions will be kept. Continue?"
2. On confirm: a version snapshot is saved (so the prior state is recoverable from history — §5.8), then the BOM is wiped and re-derived from the new configuration. Funding and financial assumptions are preserved.
3. On cancel: no change.

This is the deliberate v1 behaviour. We do **not** attempt best-effort migration of overrides across configurations in v1 (see §11).

#### 5.9.6 Manual override of derived BOM

After derivation, the analyst can still:

- Edit the unit cost of any line (override flag set on that line).
- Edit the quantity of any line (override flag set on that line).
- Add a free-form non-derived line item (always treated as "manual", carried as-is).
- Remove a derived line entirely (override flag = "removed").

Override flags survive re-derivation triggered by **catalog or rules updates** (existing behaviour from POC), but do **not** survive a **configuration change** (per 5.9.5).

#### 5.9.7 Acceptance

- An analyst can pick a configuration, set plant size, and see a fully populated BOM derived from rules within the same render frame.
- Switching from `voltage = LT` to `voltage = HT` re-derives the BOM, applies any HT-specific multipliers, and the change in transformer cost is visible immediately (after the confirm dialog).
- The aggregation example in §5.9.2 is implemented exactly as shown — verified by a unit test in `src/lib/calc/` (or `src/lib/derive/`) covering both the LT and HT configurations.
- The seed configuration list (axes, options, rules) is loaded from a single canonical source (post-workshop) and is the only place this data lives.

---

## 6. Out of Scope (v1)

Explicitly **not** in v1. Anyone advocating to add these mid-build should be pointed here first.

- Real authentication. Username = pick name from a dropdown. No passwords, no SSO.
- Multi-supplier price comparison in catalog (one supplier per BOM row).
- Backend / cloud sync / multi-device. Data lives in browser `localStorage`, period.
- PPA contract review, e-signature, legal redlining, multi-party negotiation.
- Live grid tariff or commodity price feeds. Catalog stays manual.
- Native iOS/Android apps. PWA only.
- Offline support beyond standard PWA caching.
- Multi-currency, multi-region. India + ₹ only.
- Notifications (email, push, in-app).
- Project lifecycle tracking past feasibility (construction, commissioning, O&M).
- Permissions / role separation. Owner-only edit is enforced by _who has the file_; there is no central permission system because there is no central anything.
- **In-app editor for configuration axes & options.** Axes (`voltage_level`, etc.) and their options (`LT`, `HT`, etc.) are hardcoded in v1 from the founder + expert workshop output. Catalog rows and rules are editable in-app; the _taxonomy_ is not.
- **Cross-axis dependencies / invalid-combination rules.** Axes are orthogonal in v1. If a combination genuinely doesn't make sense, it gets handled by adding a new axis next workshop.
- **Best-effort override migration on configuration change.** A configuration change is a hard reset of the BOM (§5.9.5).

---

## 7. Key User Journeys

### J1 — Quick deal sanity check (Founder, on phone, in a meeting)

Open SolarCalc → New Estimate → pick configuration (e.g. Open Access / HT / Ground) → enter size and rough capex tweaks → see IRR/payback in one screen → decide "worth a deeper look" or "kill". <2 minutes end-to-end.

### J2 — Build a deep estimate (Analyst, on laptop, in office)

Open SolarCalc → New Estimate → pick configuration → set plant size → BOM auto-derives from catalog × rules → adjust individual BOM lines if needed (overrides flagged) → set funding (debt %, rate, tenure) → tune PPA rate / CUF → review full P&L → save with a meaningful name → export PDF for the deal folder.

### J3 — Compare two estimates (Analyst → Founder)

Analyst saves "Deal X — Open Access HT Ground @ 3.5 ₹ PPA" and "Deal X — Captive HT Ground @ 4.0 ₹ PPA" → opens compare view → configuration differences are highlighted at the top, KPI deltas below → screenshots or PDFs the comparison → walks Founder through the diff.

### J4 — Cross-team sharing (EPC Engineer → Financial Analyst)

Engineer builds a BOM-heavy estimate → exports as file (which carries the catalog rows + rules used) → emails to analyst → analyst imports into her browser → estimate appears in her library tagged "received from [Engineer] on [date]" with the engineer's snapshot of catalog/rules → she compares it against her own estimates → optionally forks it to refine.

### J5 — Promote estimate to PPA (Founder)

Open approved estimate → "Generate PPA" → review draft (configuration values are merged in alongside commercial terms) → send to legal team for manual finalisation (outside SolarCalc).

### J6 — Catalog & rules update (Analyst, weekly/monthly)

Receive updated supplier prices → open catalog editor → update changed rows → save catalog. Open rules editor → tweak a per-MW quantity if a real project showed the existing rule was off → save rules. New estimates use new prices/rules automatically; existing saved estimates remain untouched (their snapshot is preserved).

### J7 — Switch configuration mid-estimate (Analyst)

Working on a Rooftop estimate → realises it should actually be Ground → changes the `mounting_type` selector → confirms the warning ("This will reset BOM and discard overrides; funding/assumptions kept; previous state goes to history") → BOM re-derives → if she misses the old overrides, opens version history and restores the prior version.

---

## 8. Data, Persistence & Sharing Model

**Storage:** browser `localStorage` only. Every device is its own world.

### 8.1 Estimate

```
id:               UUID
name:             string
createdBy:        string  (name from dropdown at creation time)
createdAt:        ISO timestamp
updatedAt:        ISO timestamp
updatedBy:        string

configuration:    { axisId: optionId, ... }     // §5.9 — exactly one option per configured axis

size_mw:          number

derivedBom:       [                              // result of rules × catalog × size, with overrides applied
  {
    materialId:        string                    // catalog material identity
    quantity:          number
    unitCost:          number                    // ₹
    overrides:         { quantity?: bool, unitCost?: bool, manualLine?: bool, removed?: bool }
    sourceRules:       [ruleId]                  // which rules contributed (for "why is this here?" UX)
  }
]

nonBomCosts:      [ ... ]                        // free-form additional capex (land, dev fees, etc.)

funding:          { equityPct, debtPct, interestRate, tenure }
financialAssumptions: { lifespan, degradation, inflation, discount, cuf, ppaRate, ppaEscalation, omPct }

versions:         [ { versionId, savedBy, savedAt, snapshot } ]
importedFrom?:    { originalAuthor, originalCreatedAt, receivedAt, receivedFrom }
catalogSnapshot:  { catalogRowsUsed: [...], rulesUsed: [...] }   // for share-payload safety; see 8.4
```

### 8.2 Catalog

```
catalog:
  rows: [
    {
      materialId:   string         // stable identity, e.g. "dc_cable"
      label:        string
      unit:         string         // "m", "unit", "kg", ...
      unitCost:     number         // ₹
      notes?:       string
      lastUpdated:  ISO timestamp
    }
  ]
  rules: [
    {
      ruleId:               string
      kind:                 "add" | "multiply"
      when:                 { axisId: optionId, ... }   // empty = always
      // for "add":
      materialId?:          string
      quantityPerMw?:       number
      quantityPerProject?:  number
      // for "multiply":
      multiply?:            { materialId: string, factor: number }
      notes?:               string
    }
  ]
```

### 8.3 Configuration taxonomy (hardcoded seed in v1)

```
axes: [
  {
    axisId:       string         // e.g. "voltage_level"
    label:        string         // "Voltage level"
    displayOrder: number
    options: [
      { optionId: string, label: string, displayOrder: number }
    ]
  }
]
```

This lives in code (a typed seed module) for v1. Editing it is a code change. Adding a new axis or option is a follow-up workshop item, not a user action.

### 8.4 Sharing payload

An exported `.json` file containing:

- The full estimate snapshot (everything in 8.1)
- `catalogSnapshot` — the catalog rows and rules that were referenced when this estimate was last derived
- The configuration taxonomy version that was current when exported (so the recipient can warn if their taxonomy has drifted)

This means the recipient sees the same numbers even if their own catalog/rules differ. They can choose to "re-derive against my catalog" later to see how their pricing would change the deal.

### 8.5 Versioning

Save creates a version. Restore = create a new version from an old snapshot (never destructive). A configuration change creates a version _before_ the reset (per §5.9.5).

---

## 9. Constraints & Design Principles

These come from [`AGENTS.md`](../AGENTS.md) and [`docs/design.md`](design.md) and remain authoritative for v1.

- **Mobile-first**, ≥ 360 px wide, tap targets ≥ 48 px. Bottom nav under `md`, top nav at `md+`. Same routes, same data, same store on both — never gate functionality behind `hidden md:block`.
- **Numbers are first-class.** Every figure on screen is tabular-numeric and uses `lib/format.ts` helpers. No inline formatting, ever.
- **Layering is strict:** `routes/` → `store/` → `lib/` → `types/`. Calc engine, catalog, and rules-derivation logic stay UI-agnostic and trivially testable.
- **Derivation is pure.** `derive(configuration, size, catalog, rules) → BOM[]` is a pure function in `src/lib/`. No React, no store reads. This is non-negotiable; it's what lets us test the worked example in §5.9.2 directly.
- **₹ only**, India, CEA grid factor `0.82 kg CO₂/kWh`.
- **Tokens only**, no inline hex / px / shadows. One amber accent per screen, max.
- **Accuracy is non-negotiable.** Calc output must match the reference Excel models within reasonable rounding tolerance. Every change to `src/lib/calc/` or `src/lib/derive/` requires tests in the same commit.
- **Performance budget:** input change → KPI update visible in the same render frame; comparison view loads in <500 ms; cold app load on a mid-range Android phone <3 s on 4G.
- **Accessibility:** WCAG-AA contrast, visible focus rings, never colour as the only signal.

---

## 10. Open Questions & Risks

| #   | Item                                                                                                                                       | Why it matters                                                          | When to resolve                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------- |
| Q1  | Final list of configuration **axes**, **options per axis**, and **rules per (axis, option)** — output of the founder + expert workshop.    | Defines the seed in §8.3; without it nothing else in §5.9 can be built. | Before `speckit-plan` for §5.9    |
| Q2  | Final PPA template content & merge fields                                                                                                  | Drives the merge-field schema for §5.7                                  | Before `speckit-plan` for PPA gen |
| Q3  | Whether the catalog (rows + rules) should be exportable / importable as a file so the analyst can canonically share it with the team       | Mitigates "everyone has a different catalog" — see R1                   | During catalog feature spec       |
| Q4  | Whether the share payload includes the catalog + rules snapshot used (proposed: yes — see §8.4)                                            | High-value safety net; modest complexity                                | During sharing feature spec       |
| Q5  | DOCX vs PDF-only for PPA output                                                                                                            | Editing PDFs is painful; DOCX is friendlier for legal review            | Before PPA gen build              |
| Q6  | Should rule actions support more than `add` and `multiply` in v1? (e.g. `replace`, `set_quantity`, `add_percentage_of_capex`)              | Could simplify or complicate the rules layer                            | During configuration feature spec |
| Q7  | Are there materials whose **unit** changes between configurations? (E.g. cable measured in metres normally, but in coils for some setups.) | Could break the simple aggregation model in §5.9.2                      | During configuration feature spec |
| R1  | Catalog & rules drift between team members (no sync) is the single biggest scaling risk                                                    | If unmanaged, breaks the "single source of truth" goal                  | Mitigate via Q3 + Q4              |
| R2  | `localStorage` quota (~5–10 MB) could bind once history accumulates                                                                        | History pruning policy may be needed                                    | Monitor; address only if hit      |
| R3  | "Pick name from dropdown" auth is trivially bypassable; acceptable internal-only, dangerous if URL ever leaks                              | Document; revisit if hosting model changes                              | Note in deployment guide          |
| R4  | Rules engine flexibility is a double-edged sword — too rigid → analysts override every line; too flexible → analysts can't reason about it | Watch override rate as a leading indicator (§4 failure signal)          | Post-rollout monitoring           |
| R5  | The hardcoded taxonomy means new configurations require a code change — could become a bottleneck if the workshop missed important axes    | Plan for a v2 in-app editor (§11) if signals show frequent need         | Post-rollout                      |

---

## 11. Post-v1 Hints (Explicitly Deferred, Not Promised)

If v1 succeeds and we want a v2, the most likely next steps in priority order:

1. **In-app editor for configuration axes & options.** Lets the analyst add a new axis ("battery storage: yes/no") without a code release.
2. **Best-effort override migration on configuration change.** Keep overrides on materials that exist in both source and target configurations; only drop the rest. (We chose hard reset in v1 for simplicity.)
3. **Tiny shared backend** to make "team library" real (Option B from the PRD interview).
4. **Multi-supplier comparison** in catalog and per BOM line.
5. **Real auth** (paired with backend).
6. **Richer rule actions** — `replace`, `set_quantity`, `percentage_of_capex`, cross-axis conditions.
7. **PPA workflow:** redlining, e-sign, version-controlled legal collaboration.
8. **Project lifecycle:** track deals past feasibility into construction and operations.
9. **Live data feeds:** commodity prices, grid tariffs.

None of these justify scope creep into v1.

---

## 12. Appendix — Glossary

For non-finance/non-engineering readers of this doc; the intended user team is already fluent in all of these.

**Product/data terms (defined in this PRD):**

- **Estimate** — a saved feasibility model for a specific deal. The unit users create, save, share, and compare. (Replaces the older POC term "scenario".)
- **Configuration** — the set of project-shape choices on an estimate (one option per configured axis). E.g. `{Open Access, HT, Ground}`.
- **Axis** — an independent dimension of the configuration. E.g. `commercial_structure`, `voltage_level`, `mounting_type`.
- **Option** — a value an axis can take. E.g. `LT` and `HT` are options of the `voltage_level` axis.
- **Material** — a normalised identity for a physical thing that costs money (e.g. `dc_cable`). Lives in the catalog; is what BOM lines are aggregated by.
- **Rule** — a derivation entry that says "for this configuration, add/multiply this material". Together with the catalog, rules produce the derived BOM.
- **Override** — a manual edit to a derived BOM line (quantity, unit cost, removal) or a free-form added line; flagged so we don't silently overwrite analyst intent on re-derivation.

**Domain terms:**

- **IRR** — Internal Rate of Return; discount rate at which NPV = 0.
- **LCOE** — Levelised Cost of Electricity (₹/kWh); lifetime cost ÷ lifetime energy.
- **NPV** — Net Present Value; today's value of all future cash flows minus capex.
- **Payback** — years until cumulative cash flow turns positive.
- **CUF** — Capacity Utilisation Factor; ratio of actual energy to nameplate × hours.
- **PPA** — Power Purchase Agreement; contract under which the plant sells electricity.
- **BOM** — Bill of Materials; line-item cost breakdown of plant components.
- **COD** — Commercial Operations Date; the date the plant starts selling power.
- **EPC** — Engineering, Procurement, Construction; the build-and-deliver contractor model.
- **Captive / Open Access / Group Captive** — commercial structures for who consumes the power generated, each with different regulatory and metering implications.
- **HT / LT** — High Tension / Low Tension; the voltage class of grid connection. HT requires bigger transformers, switchgear, transmission infrastructure.

---

_End of v1 PRD._
