#!/usr/bin/env bash
# scripts/seed-github.sh
#
# One-shot bootstrap for the SolarCalc India GitHub repo:
#   1. Creates labels we'll use across issues and PRs.
#   2. Creates a starter set of well-scoped issues so the next contributor
#      has a buffet to pick from on day 2.
#
# PREREQUISITES
#   - gh CLI installed and authenticated:  gh auth login -h github.com
#   - Run from the repo root.
#
# USAGE
#   ./scripts/seed-github.sh                  # do it
#   ./scripts/seed-github.sh --labels-only    # just the labels, skip issues
#   ./scripts/seed-github.sh --dry-run        # print what would happen
#
# This script is intentionally safe to re-run for labels (uses --force) but
# WILL create duplicate issues if run twice. Edit the issue list below before
# running, then run once.

set -euo pipefail

DRY_RUN=0
LABELS_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --labels-only) LABELS_ONLY=1 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 1 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "DRY: $*"
  else
    "$@"
  fi
}

# Confirm we're in the right repo.
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "▸ Target repo: $REPO"
echo

# ---------- Labels ----------
echo "▸ Creating labels…"

# Format: name|color (no #)|description
LABELS=(
  "domain|8B5CF6|Solar / finance / regulatory correctness"
  "calc|047857|Finance engine (src/lib/calc/)"
  "catalog|0EA5E9|BOM / material catalog"
  "ui|F59E0B|Components, routes, design system"
  "infra|64748B|Build, CI, deploy, tooling"
  "docs|14B8A6|README, architecture, design, onboarding"
  "bug|EF4444|Something is broken"
  "good-first-issue|10B981|Small, well-scoped, useful for warming up"
  "needs-discussion|FBBF24|Decide together before starting"
)

for entry in "${LABELS[@]}"; do
  IFS='|' read -r name color desc <<< "$entry"
  run gh label create "$name" --color "$color" --description "$desc" --force
done

echo
if [[ "$LABELS_ONLY" == "1" ]]; then
  echo "✓ Labels done. Skipping issues per --labels-only."
  exit 0
fi

# ---------- Issues ----------
echo "▸ Creating starter issues…"
echo

create_issue() {
  local title="$1"; shift
  local body="$1"; shift
  local labels="$1"; shift
  run gh issue create --title "$title" --label "$labels" --body "$body"
}

# 1. Domain audit (the natural first big task for a domain expert)
create_issue \
  "Domain audit: validate calc assumptions against real Indian solar practice" \
  "$(cat <<'EOF'
Author \`docs/domain-assumptions.md\` documenting every assumption baked into
the calc engine, validated against current industry practice.

Things to verify (non-exhaustive):

- \`CO2_FACTOR_KG_PER_KWH = 0.82\` in \`src/lib/calc/co2.ts\` — current value of
  the India CEA grid factor?
- IRR Newton-Raphson seed (\`0.10\`) in \`src/lib/calc/cashflow.ts\` — reasonable
  seed for utility-scale solar in India today?
- Default O&M %-of-CAPEX in \`src/store/catalog.ts\` and seed catalogs — match
  industry ranges?
- Defaults for lifespan (25y), degradation (0.5%/y), CUF, PPA escalation,
  discount rate — match what real PPAs use?
- BOM-per-MW templates in \`src/lib/catalog/seedMaterialCatalog.ts\` —
  realistic quantities and unit costs for ground-mount, rooftop, carport?
- Open-access regulatory assumptions in \`docs/Solar Open Access in
  Telangana (3).pdf\` — reflected anywhere in the calc?

Deliverable: a doc + 2–3 small follow-up PRs fixing whatever's wrong.
Reference: \`docs/onboarding.md\` §"Week 1 — pick your focus".
EOF
)" \
  "domain,docs"

# 2. Lint warnings cleanup
create_issue \
  "Clean up the 4 pre-existing ESLint warnings" \
  "$(cat <<'EOF'
Currently \`npm run lint\` reports 0 errors but 4 warnings. Bring this to 0.

Files:
- \`src/lib/storage/bootstrap.ts:44\` — unused eslint-disable directive
- \`src/lib/storage/bootstrap.ts:70\` — unused eslint-disable directive
- \`src/routes/Compare/PPARatesPanel.tsx:134\` — \`useEffect\` missing dependency
  \`estimate\`
- \`src/routes/EstimateBuilder/TemplatePicker.tsx:250\` — react-refresh
  only-export-components

For the \`useEffect\` warning, audit whether \`estimate\` should actually be a
dependency or whether the effect is missing a guard. Don't blindly add it.
EOF
)" \
  "good-first-issue,ui"

# 3. CI on push
create_issue \
  "Add GitHub Actions CI: lint + test on push to main and PRs" \
  "$(cat <<'EOF'
Set up \`.github/workflows/ci.yml\` that on \`push\` and \`pull_request\` to \`main\`:

1. Checks out the code
2. Sets up Node 20
3. \`npm ci\`
4. Runs \`npm run lint\`
5. Runs \`npm test\`
6. Runs \`npm run build\`

Goal: the same checks that the \`pre-push\` hook runs locally also run in CI,
so we catch anything that slipped past the hook (or anyone who used
\`--no-verify\`).

Bonus: cache \`node_modules\` via \`actions/setup-node\` cache option.
EOF
)" \
  "infra"

# 4. Preview deploys
create_issue \
  "Add Netlify/Vercel preview deploys on PR" \
  "$(cat <<'EOF'
Once we start opening PRs (rare, but for big changes), having a preview URL
on the PR is huge. Pick one of:

- Netlify: connect the repo, enable PR previews, point at \`dist/\`.
- Vercel: same shape, slightly different config.
- GitHub Pages from \`gh-pages\` branch (lower fidelity, no PR previews).

Output: a working preview URL on every PR + a \`docs/decisions/\` ADR noting
which we picked and why.
EOF
)" \
  "infra,needs-discussion"

# 5. chartTheme helper
create_issue \
  "Extract chartTheme helper into src/lib/charts/" \
  "$(cat <<'EOF'
\`docs/design.md\` §9.5 specifies the standard Recharts axis/grid/tooltip
styling, with this note: "Or the equivalent React-style props using the
shared \`chartTheme\` helper to be added under \`src/lib/charts/\`."

That helper doesn't exist yet — every chart in \`src/components/charts/\`
re-implements the styling. Extract it.

Approach:
1. Create \`src/lib/charts/theme.ts\` (note: this is the only allowed
   exception to "lib/ has no React" — it returns plain objects/CSS strings
   the routes pass into Recharts; no JSX).
2. Export \`chartTheme.cartesianGrid\`, \`chartTheme.axis\`, \`chartTheme.tooltip\`
   matching the spec in design.md §9.5.
3. Refactor \`MultiCashFlowChart\`, \`CashFlowChart\`, \`YearlyBarChart\`,
   \`CostDonut\` to use it.
4. Update design.md §9.5 to remove the "to be added" caveat.

Tests: snapshot or shape tests for the returned objects so the design
contract is enforced in code.
EOF
)" \
  "ui,calc"

# 6. Remove legacy design tokens
create_issue \
  "Remove deprecated legacy design tokens" \
  "$(cat <<'EOF'
\`docs/design.md\` §3.4 documents legacy token aliases (\`surface-tint\`,
\`primary-fixed\`, \`tertiary-fixed\`, \`inverse-surface\`,
\`surface-container-lowest\`, \`surface-container-low\`, etc.) that exist for
back-compat in \`tailwind.config.ts\`.

Plus legacy type aliases: \`headline-xl\`, \`headline-lg\`, \`body-lg\`,
\`body-md\`, \`label-sm\`, \`data-display\` (mapped to \`display\`, \`headline\`,
\`title\`, \`body\`, \`label\`, \`data\`).

Do a pass:
1. \`rg\` for each legacy token across \`src/\`.
2. Replace each usage with the canonical token.
3. Remove the alias from \`tailwind.config.ts\`.
4. Run lint/test/build green.

Do this in small commits — one token family per commit — so it's easy to
revert if something breaks.
EOF
)" \
  "ui"

# 7. Field input primitive
create_issue \
  "Extract a Field/Input primitive component" \
  "$(cat <<'EOF'
\`docs/design.md\` §10.2 specifies the standard input pattern (label,
inputmode, focus styles, error state, helper text) but notes "no dedicated
component yet — extract one when added".

Multiple routes currently re-implement this pattern. Extract it.

Requirements:
- \`<Field label="..." hint="..." error="..." />\` wrapping a child input
- Supports the mobile inputmode rules (\`decimal\` for ₹/%, \`numeric\` for
  years)
- Error state: red border + helper text + leading icon (per design.md)
- Focus ring per design tokens

Then refactor at least \`ScenarioBuilder/FormSection.tsx\` and
\`Settings\` to use it. Document the new component in design.md §10.2.
EOF
)" \
  "ui"

# 8. usePrepaymentMax tests
create_issue \
  "Add tests for usePrepaymentMax fixed-point search" \
  "$(cat <<'EOF'
\`src/routes/Results/usePrepaymentMax.ts\` contains the iterative fixed-point
search that determines the upper bound on the Loan Prepayment slider ("no
loan-active year goes negative"). It's referenced in
\`docs/architecture.md\` §"What-if overrides" but has no tests.

Add a test file next to it (\`usePrepaymentMax.test.ts\`) covering:
- Convergence on a normal scenario
- A degenerate scenario where prepayment max is 0 (high O&M, low CF)
- A scenario where prepayment max equals the full loan (huge surplus)
- Boundary: grace period equals loan term

Hint: the hook depends on React, but the fixed-point search itself should
be extractable as a pure function in \`src/lib/calc/\` (likely
\`loan.ts\`-adjacent). Consider doing that extraction in this PR.
EOF
)" \
  "calc"

# 9. ADR template
create_issue \
  "Add a docs/decisions/ ADR template" \
  "$(cat <<'EOF'
\`CONTRIBUTING.md\` references \`docs/decisions/YYYY-MM-DD-<slug>.md\` for
recording cross-cutting decisions. Create:

1. The \`docs/decisions/\` folder.
2. A \`docs/decisions/000-template.md\` showing the structure
   (Context / Decision / Consequences — short, two paragraphs each).
3. A first real ADR: \`001-trunk-based-with-pre-push-hooks.md\` documenting
   why we chose this workflow over PR-required.

Optional: a tiny \`scripts/new-adr.sh\` that copies the template with today's
date and a slug.
EOF
)" \
  "docs,good-first-issue"

# 10. Onboarding checklist (for them, by them)
create_issue \
  "[Self] Complete the day-1 onboarding reading path" \
  "$(cat <<'EOF'
Walk through \`docs/onboarding.md\` end to end. Open this issue assigned to
yourself, check off each item:

- [ ] Setup verified (\`npm install\`, dev/test/build all green)
- [ ] Read README.md
- [ ] Read docs/prd.md
- [ ] Read docs/architecture.md (re-read §"Override flags" twice)
- [ ] Read docs/design.md (skim, know it exists)
- [ ] Walk src/lib/calc/ + index.test.ts in watch mode
- [ ] Trace one route end-to-end (EstimateBuilder → Results)
- [ ] Read AGENTS.md + CONTRIBUTING.md + .cursor/rules/
- [ ] Pair on the GitHub Issues board
- [ ] Build a few estimates by hand in the running app
- [ ] Write down anything that felt weird (file as bug/doc issues)

Close once done.
EOF
)" \
  "docs"

echo
echo "✓ Done. Run \`gh issue list\` to verify."
