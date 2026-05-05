import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

type FilterAccordionProps = {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Retail-style collapsible filter group — full-width header, indented body.
 */
export function FilterAccordion({
  title,
  icon,
  defaultOpen = true,
  children,
}: FilterAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-outline-variant/25 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-h-touch-target items-center justify-between gap-md py-md text-left hover:bg-surface-container-low/60 rounded-lg px-sm -mx-sm transition-colors"
        aria-expanded={open}
        id={`filter-acc-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span className="flex items-center gap-sm font-body-md font-semibold text-on-surface">
          <Icon name={icon} className="text-xl text-primary shrink-0" aria-hidden />
          {title}
        </span>
        <Icon
          name={open ? 'expand_less' : 'expand_more'}
          className="text-on-surface-variant text-2xl shrink-0"
          aria-hidden
        />
      </button>
      {open && (
        <div className="pb-md pt-0 flex flex-col gap-sm border-l-2 border-primary/20 ml-2 pl-sm">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Shared accordion stack for desktop rail and mobile filter card.
 */
export function EstimateFilterAccordions({
  notices,
  configurationContent,
  capacityContent,
}: {
  notices?: ReactNode;
  configurationContent: ReactNode;
  capacityContent: ReactNode;
}) {
  return (
    <>
      {notices}
      <FilterAccordion title="Configuration" icon="tune" defaultOpen>
        {configurationContent}
      </FilterAccordion>
      <FilterAccordion title="Capacity planning" icon="dashboard" defaultOpen>
        {capacityContent}
      </FilterAccordion>
    </>
  );
}

type Props = {
  nameEditor: ReactNode;
  projectSubtitle?: string;
  /** Applied choices — e.g. pill chips (retail “active filters”). */
  summary: ReactNode;
  /** Version sync / notices above accordions. */
  notices?: ReactNode;
  configurationContent: ReactNode;
  capacityContent: ReactNode;
};

/**
 * Desktop left rail: project header, active-filter summary, accordion stacks.
 */
export function EstimateSidebar({
  nameEditor,
  projectSubtitle,
  summary,
  notices,
  configurationContent,
  capacityContent,
}: Props) {
  return (
    <aside className="hidden md:flex md:flex-col w-[24rem] shrink-0 min-h-0 max-h-[calc(100dvh-5rem)] sticky top-20 self-start rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-card overflow-hidden">
      <div className="flex items-start gap-md p-lg border-b border-outline-variant/30 shrink-0">
        <div className="h-12 w-12 rounded-xl bg-primary-fixed/40 flex items-center justify-center text-primary shrink-0">
          <Icon name="solar_power" className="text-2xl" />
        </div>
        <div className="min-w-0 flex flex-col gap-0.5 flex-1">
          {nameEditor}
          {projectSubtitle && (
            <span
              className="font-label-sm text-label-sm text-on-surface-variant truncate"
              title={projectSubtitle}
            >
              {projectSubtitle}
            </span>
          )}
        </div>
      </div>

      <div className="px-md pt-md pb-sm shrink-0 border-b border-outline-variant/20">
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">
          Active setup
        </p>
        {summary}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-md pb-md">
        <EstimateFilterAccordions
          notices={notices}
          configurationContent={configurationContent}
          capacityContent={capacityContent}
        />
      </div>
    </aside>
  );
}
