export type ProjectType = 'utility' | 'commercial' | 'hybrid' | 'residential';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  utility: 'Utility-Scale',
  commercial: 'Commercial',
  hybrid: 'Solar + Storage',
  residential: 'Residential',
};
