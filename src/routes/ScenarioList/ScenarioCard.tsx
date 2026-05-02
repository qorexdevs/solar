import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusTag } from '@/components/ui/Tag';
import { formatMW, formatRate } from '@/lib/format';
import { PROJECT_TYPE_LABELS, type Scenario, type ScenarioStatus } from '@/types';

const STATUS_BORDER: Record<ScenarioStatus, string> = {
  feasible: 'border-l-primary-container',
  draft: 'border-l-surface-tint',
  review: 'border-l-outline',
};

type Props = {
  scenario: Scenario;
  irr: number | null;
  inComparison: boolean;
  onToggleCompare: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function ScenarioCard({
  scenario,
  irr,
  inComparison,
  onToggleCompare,
  onOpen,
  onEdit,
  onDuplicate,
  onRemove,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const irrLabel = scenario.status === 'review' || irr === null ? '--' : formatRate(irr);

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl shadow-card-lg border border-outline-variant overflow-hidden flex flex-col border-l-4 ${STATUS_BORDER[scenario.status]}`}
    >
      <div className="p-md flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <StatusTag status={scenario.status} className="mb-2" />
            <h4 className="font-body-lg text-body-lg font-bold text-on-background">
              {scenario.name}
            </h4>
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="More actions"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-full hover:bg-surface-container"
            >
              <Icon name="more_vert" className="text-outline" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-elevated py-1 w-40">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-surface-container text-on-surface text-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                >
                  Edit inputs
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-surface-container text-on-surface text-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-error-container text-error text-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onRemove();
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3 mb-6">
          <Row label="Size" value={formatMW(scenario.basics.sizeMW)} />
          <Row
            label="Projected IRR"
            value={<span className="text-surface-tint">{irrLabel}</span>}
          />
          <Row label="Type" value={PROJECT_TYPE_LABELS[scenario.projectType]} last />
        </div>
      </div>
      <div className="bg-surface-container-low p-3 flex justify-between gap-2 border-t border-outline-variant">
        <button
          aria-label={inComparison ? 'Remove from comparison' : 'Add to comparison'}
          onClick={onToggleCompare}
          className={`p-2 transition-colors rounded-full ${
            inComparison
              ? 'text-primary bg-primary-fixed/40'
              : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
          }`}
          title={inComparison ? 'In comparison set' : 'Add to comparison'}
        >
          <Icon
            name={inComparison ? 'check_circle' : 'compare_arrows'}
            filled={inComparison}
          />
        </button>
        <div className="flex gap-2">
          <button
            aria-label="Delete"
            onClick={onRemove}
            className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error-container"
          >
            <Icon name="delete" />
          </button>
          <button
            aria-label="Duplicate"
            onClick={onDuplicate}
            className="p-2 text-on-surface-variant hover:text-secondary-container transition-colors rounded-full hover:bg-surface-container"
          >
            <Icon name="content_copy" />
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="px-4 py-2 bg-surface-tint text-on-primary rounded-lg font-body-md text-body-md hover:bg-primary-container transition-colors flex items-center gap-1"
          >
            Open <Icon name="arrow_forward" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${last ? '' : 'border-b border-outline-variant pb-2'}`}
    >
      <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
      <span className="font-body-md text-body-md font-semibold">{value}</span>
    </div>
  );
}
