import type { LineApplicability, ScalingType } from './scenarioTemplate';

/**
 * One row in the template's Other Scope of Works section. Other-scope items
 * are priced as a `baseAmount` (no quantity / rate split); they roll into
 * the Grand Total per PRD §7.
 */
export type OtherScopeItem = {
  id: string;
  sequence: number;
  scopeName: string;
  /** Total INR at the template's base capacity. */
  baseAmount: number;
  gstPercent: number;
  scalingType: ScalingType;
  /** See `BOMLineItem.scalingFormula`. Variables: `targetKW`, `baseKW`, `baseAmount`. */
  scalingFormula?: string;
  unitCapacityKW?: number;
  applicability?: LineApplicability;
  isOptional: boolean;
  includedByDefault: boolean;
  notes?: string;
};
