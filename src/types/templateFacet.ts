/**
 * A facet defines mutually-exclusive template choices inside an estimate
 * (Mounting, Business model, Voltage class, etc.).
 */
export type TemplateFacet = {
  id: string;
  name: string;
  description?: string;
  /** Sort order when rendering facet groups (ascending). */
  sequence: number;
  /** When true, EstimateBuilder blocks continue until user picks one. */
  required: boolean;
  /** Pre-fill this template id in the builder when absent. */
  defaultTemplateId?: string;
};
