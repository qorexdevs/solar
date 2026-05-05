import { facetStripAccent } from '@/lib/facets';

export type FacetSegmentedOption = {
  id: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type Props = {
  facetId: string;
  /** Shown to assistive tech as the radiogroup label */
  ariaLabel: string;
  options: FacetSegmentedOption[];
};

/**
 * Full-width segmented control for single-select facet choices (mockup-style track + raised segment).
 */
export function FacetSegmentedControl({
  facetId,
  ariaLabel,
  options,
}: Props) {
  const a = facetStripAccent(facetId);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex w-full gap-0.5 rounded-xl bg-surface-container-low p-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.selected}
          disabled={o.disabled}
          onClick={o.onSelect}
          className={`min-h-touch-target min-w-0 flex-1 rounded-lg px-2 py-sm text-center font-body-md text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 ${
            o.selected
              ? `${a.selected} shadow-sm`
              : `border border-transparent ${a.idle}`
          }`}
        >
          <span className="block truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
