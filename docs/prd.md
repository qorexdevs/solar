# Solar Plant Feasibility Calculator — Product Requirements Document

> **Implementation note.** v1 ships a **single-page builder + collapsible cost
> breakdown panel** rather than the original 5-step wizard described below.
> Materials auto-derive from a price catalog × project-type Bill of Materials,
> and the Results dashboard exposes live what-if controls (equity split, loan
> prepayment, auto-absorb). See the [README](../README.md) and
> [architecture overview](architecture.md) for the shipped behavior; the
> sections below capture the original product intent that informed it.

## Overview

A **responsive web application (installable as a PWA)** for calculating the cost, ROI, and feasibility of solar plant projects. The tool is for **internal team use**, supporting mixed technical and non-technical users. Projects range from **0.25 MW to 5 MW**.

Team members use the app on laptops at their desks and on phones during site visits, client calls, or while traveling, so **mobile is a primary surface, not a fallback**.

The app must support **multiple named scenarios**, allow **side-by-side comparison**, and export results to both **PDF and Excel/CSV**.

---

## Locale & Currency

- Currency: **INR (₹)**
- All monetary inputs and outputs in Indian Rupees
- CO2 emissions factor: **0.82 kg CO2/kWh** (India CEA grid default)
- Default inflation rate: **6% per annum** (India baseline)

---

## Platform & Devices

- **Single responsive web codebase** with mobile-first layouts; same app, same URL, same data on every device
- **Supported viewport range:** ~360px wide and up
- **Installable as a PWA** on Android and iOS — web app manifest, service worker, home-screen icon, and offline-tolerant access to already-loaded scenarios
- **Touch-first interactions** with a minimum **48px tap target** (matches the `touch-target` token in the Stitch designs)
- All core flows — create, edit, view results, compare, export — must be **fully usable on a phone**, not just viewable

---

## Inputs

### 1. Project Basics (per scenario)

| Input                             | Type           | Notes                                      |
| --------------------------------- | -------------- | ------------------------------------------ |
| Scenario name                     | Text           | For identification in comparison view      |
| Project size                      | Number (MW)    | Range: 0.25 – 5 MW                         |
| Project lifespan                  | Number (years) | Configurable per scenario                  |
| Capacity Utilisation Factor (CUF) | %              | Used to calculate annual energy generation |
| Panel degradation rate            | % per year     | Default: **0.5%/yr**, manually editable    |
| Inflation rate                    | % per year     | Default: **6%/yr**, manually editable      |

### 2. Material Costs

Fixed categories (with editable unit prices and quantities):

- Solar Panels
- Cables
- Inverters
- Mounting Structures
- Transformers
- Civil Works
- Balance of System (BOS)

Plus: ability to **add and remove custom line items** freely (name + cost).

### 3. Revenue Model

| Input                 | Type       | Notes                                          |
| --------------------- | ---------- | ---------------------------------------------- |
| PPA rate              | ₹/kWh      | Fixed rate agreed via Power Purchase Agreement |
| Annual PPA escalation | % per year | Optional; tied to inflation or custom rate     |

### 4. O&M Costs (Operations & Maintenance)

- Annual O&M cost input (₹)
- Modelled **year-over-year**, escalated by the inflation rate
- Should allow overriding individual years if needed

### 5. Financing / Loan

| Input                                                             | Type        |
| ----------------------------------------------------------------- | ----------- |
| Total project cost (auto-calculated from materials + other costs) | ₹           |
| % of project cost to be financed (or manual loan amount)          | % or ₹      |
| Interest rate                                                     | % per annum |
| Loan term                                                         | Years       |
| Grace period before repayments begin                              | Years       |

Loan repayment schedule (EMI or annuity) should be computed and factored into year-by-year cash flows.

---

## Outputs

### Financial Metrics

- **Total Project Cost** (capital expenditure breakdown)
- **Break-even Year** — the year cumulative cash flow turns positive
- **Payback Period** — in years
- **NPV (Net Present Value)** — using a configurable discount rate
- **IRR (Internal Rate of Return)**
- **Year-by-Year P&L Table** — showing revenue, O&M, loan repayment, net cash flow, cumulative cash flow per year

### Sustainability Metrics

- **Annual CO2 offset** (tonnes/year)
- **Cumulative CO2 offset** over project lifespan (tonnes)
- Based on India CEA grid emission factor: 0.82 kg CO2/kWh

### Visualisations

- **Cumulative cash flow chart** over project lifespan (line chart)
- **Year-by-year net cash flow** (bar chart)
- **Cost breakdown** (pie or donut chart showing material categories)

---

## Scenario Management

- Users can **create, name, and save multiple scenarios**
- Scenarios persist across sessions (use persistent key-value storage)
- **Side-by-side comparison view** — compare key metrics across 2 or more scenarios in a table
- Ability to **duplicate or delete** a scenario

---

## Export

- **PDF export** — summary of inputs, outputs, charts for a selected scenario
- **Excel / CSV export** — full year-by-year data table and inputs for a selected scenario

---

## Calculations Reference

### Annual Energy Generation

```
Annual Output (kWh) = Plant Capacity (kW) × CUF (%) × 8,760 hours
```

Apply panel degradation annually:

```
Output_year_n = Annual Output × (1 - degradation_rate)^(n-1)
```

### Annual Revenue

```
Revenue_year_n = Output_year_n × PPA_rate × (1 + PPA_escalation)^(n-1)
```

### Annual O&M Cost

```
OM_year_n = Base_OM × (1 + inflation_rate)^(n-1)
```

### Loan Repayment

- Grace period: interest-only payments during grace years
- Post-grace: equal annual principal + interest (annuity method)
- Remaining principal tracked year by year

### Net Cash Flow (per year)

```
Net_CF_year_n = Revenue_year_n - OM_year_n - Loan_Repayment_year_n
```

### Cumulative Cash Flow

```
Cumulative_CF_year_n = Σ Net_CF (year 1 to n) - Initial_Equity_Investment
```

### NPV

```
NPV = Σ [ Net_CF_year_n / (1 + discount_rate)^n ] - Equity_Investment
```

Discount rate should be a configurable input (suggest default: 10%).

### IRR

Solve for r where NPV = 0 across the project lifespan.

### CO2 Offset

```
CO2_year_n (tonnes) = Output_year_n (kWh) × 0.82 / 1000
```

---

## UI/UX Notes

- Mixed technical and non-technical users — keep language plain, add tooltips for technical terms (CUF, IRR, NPV, etc.)
- Scenario builder should feel like a form wizard or tabbed interface (Project → Materials → Revenue → Financing → Results)
- Comparison view should be a clean summary table with highlighted best-performing scenario
- Charts should be interactive (hover for values)

### Mobile-specific requirements

- All five input steps (Project, Materials, Revenue, O&M, Financing) **stack vertically and remain completable on mobile**; the wizard step rail collapses to a top progress indicator.
- Numeric inputs trigger numeric keyboards on mobile (`inputmode="decimal"` for ₹ and %, `inputmode="numeric"` for years).
- Tooltips for technical terms (CUF, NPV, IRR, PPA, grace period) **open on tap** and dismiss easily.
- Charts remain interactive on touch — tap-to-reveal values, with horizontal scroll where needed for long lifespans.
- The year-by-year P&L table uses **horizontal scroll or an expandable row pattern** on small screens; key columns stay sticky.
- Comparison view falls back to either a **horizontally swipeable column-per-scenario** layout or a **stacked card** layout on small screens, with the "best value" highlight preserved.
- Scenario list, results, and exports are reachable within **1–2 taps** from the home screen.

---

## Tech Stack Suggestion (for the builder)

- **React** (single-file artifact or full app)
- **Recharts** or **Chart.js** for visualisations — both support touch interactions, which is required for mobile
- **Persistent storage** (window.storage key-value API if building as a Claude artifact, or localStorage for standalone)
- **jsPDF + SheetJS** for PDF and Excel export
- **Tailwind CSS** with mobile-first responsive utilities (`sm:` / `md:` / `lg:` breakpoints)
- **PWA setup**: web app manifest, service worker (e.g., Workbox or `vite-plugin-pwa`), installable on Android and iOS with home-screen icon and offline-tolerant cached scenarios

---

## Out of Scope (for v1)

- Multi-currency support
- Client or investor-facing polished reports
- Integration with external data sources (live electricity rates, etc.)
- **Native iOS/Android apps** — the responsive web app and PWA cover mobile usage for v1; native apps may be revisited in a future version
