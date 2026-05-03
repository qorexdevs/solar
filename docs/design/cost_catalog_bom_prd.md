***

# PRD: Scenario-Based BOM Cost Catalog

## 1. Product Overview

The product is a **scenario-based cost catalog** for creating, managing, and estimating solar project costs using real-world Bill of Materials templates.

Instead of using broad legacy cost buckets, the system will use detailed BOM structures as the source of truth. Each BOM scenario will represent a real project configuration, such as:

*   `1000 KW - Ground Mounted - HT Sync`
*   `700 KW - Ground Mounted - LT Sync`

The catalog should support both detailed line-level costing and summary-level estimate outputs. Since this is a greenfield POC, old catalog plans can be deleted and the new model should be designed to scale cleanly across future use cases.

***

## 2. Problem Statement

The current catalog model is too generic for real-world project estimation. It relies on high-level cost categories and simple capacity-based formulas, which do not capture the complexity of actual solar project execution.

The provided BOM examples show that real project costing depends on:

*   Project capacity
*   Ground-mounted vs future project types
*   HT Sync vs LT Sync
*   Component-level quantity and rate
*   Fixed, variable, and step-based costs
*   Optional scope-of-work items
*   GST/tax treatment
*   Engineering-specific items such as switch yard, earthing, metering, SCADA, cabling, and installation

The new system needs to model these real-world scenarios directly instead of forcing them into old catalog structures.

***

## 3. Goals and Non-Goals

## Goals

*   Make the BOM catalog the new source of truth.
*   Support scenario-based cost templates.
*   Capture detailed BOM line items with quantity, rate, GST, and total cost.
*   Support separate handling of main BOM and Other Scope of Works.
*   Enable capacity-based estimate generation.
*   Support HT/LT and other scenario-specific logic.
*   Allow future scenarios to scale without code rewrites.
*   Provide clear totals, GST, grand total, and per KW rate.

## Non-Goals

*   No need to maintain backward compatibility with the old catalog.
*   No need to map old legacy items to the new model.
*   No ERP, procurement, or purchase order integration in the POC.
*   No vendor negotiation or inventory management.
*   No AI-based cost prediction in the initial version.
*   No complex approval workflow in the first release unless required later.

***

## 4. Users and Use Cases

## Primary Users

### Catalog Admin

Creates and maintains BOM scenario templates, line items, rates, GST, and scaling logic.

### Estimation User

Selects a scenario, enters project capacity, includes or excludes optional scope items, and generates an estimate.

### Business Reviewer

Reviews high-level cost output, per KW rate, GST, and scenario comparisons.

### Engineering / SME User

Validates technical BOM completeness and ensures scenario logic reflects real project design.

***

## Key Use Cases

*   Create a `1000 KW Ground Mounted - HT Sync` scenario.
*   Create a `700 KW Ground Mounted - LT Sync` scenario.
*   Upload or manually enter a BOM.
*   Add main BOM line items.
*   Add Other Scope of Works.
*   Define scaling behavior per line item.
*   Generate a cost estimate for a target capacity.
*   Compare HT and LT project scenarios.
*   Export estimate summary for review.

***

## 5. Core Product Model

The system should be organized around **scenario templates**.

A scenario template represents a reusable project cost model.

## Scenario Template Fields

| Field          | Description                                 |
| -------------- | ------------------------------------------- |
| Scenario Name  | Example: `1000 KW Ground Mounted - HT Sync` |
| Project Type   | Ground Mounted, Rooftop, Hybrid, etc.       |
| Sync Type      | HT, LT, or other future types               |
| Base Capacity  | Example: 1000 KW or 700 KW                  |
| Status         | Draft, Active, Archived                     |
| Version        | Scenario version                            |
| Effective Date | Date from which this scenario is valid      |
| Description    | Notes about the scenario                    |
| Source         | Manual entry or uploaded BOM                |

***

## BOM Structure

Each scenario should contain two sections:

### 1. Main BOM

Core project materials and services.

Examples:

*   Solar PV Modules
*   Inverters
*   Power Cables
*   Panel Mounting Structure
*   Inverter Mounting Structure
*   Earthing
*   Metering and Protection Devices
*   Switch Yard
*   Services
*   DWC Pipes
*   Hardware Misc
*   Logistics and Storage

### 2. Other Scope of Works

Additional or optional scope items.

Examples:

*   CEIG
*   Module Cleaning System
*   Inverter Stands and ACDB Platform
*   Shed for Inverter and ACDB
*   RS485 Cable

***

## 6. Functional Requirements

## Scenario Management

*   Users can create, edit, duplicate, archive, and activate scenario templates.
*   Each scenario has its own BOM lines, scope items, scaling rules, and version.
*   Only one active version should be used for estimate generation unless the user explicitly selects another version.

## BOM Line Management

Each BOM line should support:

| Field               | Description                            |
| ------------------- | -------------------------------------- |
| Category            | Example: Cables, Earthing, Services    |
| Item Name           | Short item label                       |
| Description         | Detailed supply item description       |
| Make                | Vendor/make                            |
| UOM                 | Unit of measure                        |
| Quantity            | Base quantity                          |
| Rate                | Unit rate                              |
| Amount              | Quantity × Rate                        |
| GST %               | Tax percentage                         |
| GST Amount          | Calculated GST                         |
| Total Amount        | Amount + GST                           |
| Scaling Type        | Fixed, Linear, Step, Formula, Optional |
| Included by Default | Yes/No                                 |
| Notes               | Optional assumptions                   |

## Other Scope Management

*   Users can add Other Scope of Works separately from the main BOM.
*   Each scope item should have name, amount, GST if applicable, scaling type, and optional flag.
*   Other Scope items should be included in grand total and per KW rate calculations.

## Estimate Generation

*   User selects a scenario.
*   User enters target project capacity.
*   System recalculates applicable quantities and costs.
*   User can include or exclude optional scope items.
*   System displays line-level estimate and summary totals.

***

## 7. Scaling and Calculation Rules

The system should support multiple scaling methods so future use cases can be added without changing the core data model.

## Scaling Types

### 1. Fixed

Cost or quantity does not change with capacity.

Examples:

*   Weather monitoring system
*   SCADA
*   Some approvals
*   Some logistics items

### 2. Linear

Quantity scales proportionally with project capacity.

Formula:

```text
Scaled Quantity = Base Quantity × Target Capacity / Base Capacity
```

Examples:

*   Solar modules
*   Mounting structure
*   Cable length, when estimated by capacity
*   DWC pipes
*   Installation services

### 3. Step-Based

Quantity increases in discrete units.

Formula:

```text
Scaled Quantity = CEILING(Target Capacity / Unit Capacity)
```

Examples:

*   Inverters
*   ACDB panels
*   Termination boxes
*   Lightning arrestors

### 4. Conditional

Item applies only to specific scenario attributes.

Example:

```text
Include HT Switch Yard only when Sync Type = HT
```

Examples:

*   Step-up transformer
*   VCB panel
*   HT switch yard
*   HT-specific protection devices

### 5. Optional

Item can be included or excluded by the user.

Examples:

*   Module cleaning system
*   Shed for inverter and ACDB
*   RS485 cable
*   Additional monitoring equipment

***

## Calculation Rules

```text
Line Amount = Quantity × Rate
GST Amount = Line Amount × GST %
Line Total = Line Amount + GST Amount

Main BOM Total = SUM(Main BOM Line Amounts)
Main BOM GST = SUM(Main BOM GST Amounts)

Other Scope Total = SUM(Other Scope Amounts)
Other Scope GST = SUM(Other Scope GST Amounts)

Grand Total = Main BOM Total + Main BOM GST + Other Scope Total + Other Scope GST

Per KW Rate = Grand Total / Target Capacity KW
```

***

## 8. Data Model

## Entity 1: Scenario Template

| Field              | Type                      |
| ------------------ | ------------------------- |
| scenario\_id       | UUID                      |
| scenario\_name     | String                    |
| project\_type      | String                    |
| sync\_type         | Enum                      |
| base\_capacity\_kw | Number                    |
| status             | Draft / Active / Archived |
| version            | String                    |
| effective\_from    | Date                      |
| created\_by        | User                      |
| created\_at        | Timestamp                 |
| updated\_at        | Timestamp                 |

***

## Entity 2: BOM Line Item

| Field                 | Type        |
| --------------------- | ----------- |
| bom\_item\_id         | UUID        |
| scenario\_id          | UUID        |
| sequence\_number      | Number      |
| category              | String      |
| item\_name            | String      |
| description           | Text        |
| make                  | String      |
| uom                   | String      |
| base\_quantity        | Number      |
| rate                  | Number      |
| gst\_percent          | Number      |
| scaling\_type         | Enum        |
| scaling\_formula      | String      |
| applicability\_rule   | JSON / Rule |
| is\_optional          | Boolean     |
| included\_by\_default | Boolean     |
| notes                 | Text        |

***

## Entity 3: Other Scope Item

| Field                 | Type    |
| --------------------- | ------- |
| scope\_id             | UUID    |
| scenario\_id          | UUID    |
| sequence\_number      | Number  |
| scope\_name           | String  |
| amount                | Number  |
| gst\_percent          | Number  |
| scaling\_type         | Enum    |
| scaling\_formula      | String  |
| is\_optional          | Boolean |
| included\_by\_default | Boolean |
| notes                 | Text    |

***

## Entity 4: Estimate Run

| Field                | Type      |
| -------------------- | --------- |
| estimate\_id         | UUID      |
| scenario\_id         | UUID      |
| selected\_version    | String    |
| target\_capacity\_kw | Number    |
| selected\_options    | JSON      |
| calculated\_total    | Number    |
| calculated\_gst      | Number    |
| grand\_total         | Number    |
| per\_kw\_rate        | Number    |
| created\_by          | User      |
| created\_at          | Timestamp |

***

## 9. UX and Workflow Requirements

## Catalog Home

Users should see:

*   Active scenario templates
*   Project type
*   Sync type
*   Base capacity
*   Version
*   Status
*   Last updated date
*   Actions: View, Edit, Duplicate, Archive, Generate Estimate

## Scenario Detail Page

Should include:

*   Scenario metadata
*   Main BOM table
*   Other Scope of Works table
*   Summary totals
*   Version history
*   Activate/archive controls

## BOM Table

Should support:

*   Add item
*   Edit item
*   Delete item
*   Reorder item
*   Filter by category
*   View GST and totals
*   Set scaling type
*   Set optional/included flag

## Estimate Builder

User flow:

```text
Select Scenario
→ Enter Target Capacity
→ Review Included BOM Items
→ Select Optional Scope Items
→ Generate Estimate
→ Review Line-Level and Summary Output
→ Export if needed
```

## Estimate Output

Should display:

*   Main BOM total
*   GST total
*   Other Scope total
*   Grand total
*   Per KW rate
*   Included optional items
*   Excluded optional items
*   Line-level cost details

***

## 10. MVP Scope, Acceptance Criteria, and Future Scale

## MVP Scope

The first version should include:

*   Create scenario template
*   Add/edit/delete BOM line items
*   Add/edit/delete Other Scope items
*   Define scaling type per item
*   Calculate amount, GST, total, grand total, and per KW rate
*   Generate estimate for target capacity
*   Support HT and LT scenarios
*   Support optional scope item selection
*   Version scenario templates
*   Import BOM from Excel/CSV with basic validation

***

## Acceptance Criteria

### Scenario Templates

*   User can create a scenario for `1000 KW Ground Mounted - HT Sync`.
*   User can create a scenario for `700 KW Ground Mounted - LT Sync`.
*   User can mark a scenario as Draft, Active, or Archived.
*   User can duplicate an existing scenario to create a new one.

### BOM Items

*   User can add line items with category, description, make, UOM, quantity, rate, and GST.
*   System calculates line amount and GST automatically.
*   User can assign a scaling type to each line item.
*   User can define whether an item is required, optional, or conditional.

### Other Scope of Works

*   User can add Other Scope items separately from main BOM.
*   User can mark scope items as optional or included by default.
*   Other Scope totals are included in the final estimate.

### Estimate Generation

*   User can select a scenario and enter target capacity.
*   System recalculates cost based on scaling rules.
*   System includes/excludes optional items based on user selection.
*   System shows main BOM total, GST, Other Scope total, grand total, and per KW rate.

### Scenario Logic

*   HT-only items can be included only for HT scenarios.
*   LT scenarios can exclude HT-specific infrastructure.
*   Fixed, linear, step-based, conditional, and optional scaling types are supported.

***

## Future Scale

The model should be designed to support:

*   Rooftop scenarios
*   Hybrid solar scenarios
*   Battery/storage add-ons
*   Regional pricing
*   Vendor-specific pricing
*   Rate libraries
*   Scenario comparison
*   Approval workflow
*   Export to Excel/PDF
*   Advanced formula builder
*   Cost variance tracking
*   Audit history

***

# Recommended Implementation Strategy

Since this is greenfield, I’d build it in this order:

## Phase 1: Core Catalog Foundation

Build the clean source-of-truth model:

*   Scenario templates
*   Main BOM items
*   Other Scope items
*   Scaling type
*   GST and total calculations
*   Version/status model

## Phase 2: Estimate Builder

Turn the catalog into a working estimation engine:

*   Capacity input
*   Scenario selection
*   Optional scope selection
*   Scaled estimate output
*   Per KW rate

## Phase 3: Upload and Governance

Improve usability and control:

*   Excel/CSV upload
*   Import preview
*   Field validation
*   Duplicate scenario
*   Version history

## Phase 4: Scale for More Use Cases

Expand the platform:

*   New project types
*   Regional/vendor pricing
*   Scenario comparisons
*   Export options
*   Advanced rules and formulas

***

## Short Product Principle

Build this as a **configurable BOM modeling platform**, not a static cost catalog.

The new source of truth should be:

```text
Scenario Template + BOM Lines + Scope Items + Scaling Rules = Estimate
```

That gives you a clean greenfield foundation that can support the current 700 KW and 1000 KW examples while scaling to future project types without redesigning the system.
