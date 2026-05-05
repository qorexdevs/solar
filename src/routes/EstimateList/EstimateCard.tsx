import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusTag } from '@/components/ui/Tag';
import { formatINR, formatPlantCapacityKW, formatRate } from '@/lib/format';
import type { Estimate, EstimateStatus } from '@/types';

const STATUS_BORDER: Record<EstimateStatus, string> = {
  feasible: 'border-l-primary-container',
  draft: 'border-l-surface-tint',
  review: 'border-l-outline',
};

type Props = {
  estimate: Estimate;
  templateName?: string;
  grandTotal: number;
  perKwRate: number;
  irr: number | null;
  inComparison: boolean;
  onToggleCompare: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function EstimateCard({
  estimate,
  templateName,
  grandTotal,
  perKwRate,
  irr,
  inComparison,
  onToggleCompare,
  onOpen,
  onEdit,
  onDuplicate,
  onRemove,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const irrLabel =
    irr === null
      ? estimate.finance?.enabled
        ? '—'
        : 'finance off'
      : formatRate(irr);

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl shadow-card-lg border border-outline-variant overflow-hidden flex flex-col border-l-4 ${STATUS_BORDER[estimate.status]}`}
    >
      <div className="p-lg flex-grow">
        <div className="flex justify-between items-start mb-2">
          <div>
            <StatusTag status={estimate.status} className="mb-0.5" />
            <h4 className="font-body-lg text-body-lg font-bold text-on-background">
              {estimate.name}
            </h4>
            {templateName && (
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                Template: {templateName}
              </p>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              aria-label="More actions"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-0.5 rounded-full hover:bg-surface-container"
            >
              <Icon name="more_vert" className="text-outline" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-elevated py-0.5 w-40">
                <button
                  type="button"
                  className="w-full text-left px-1.5 py-1 hover:bg-surface-container text-on-surface text-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                >
                  Edit inputs
                </button>
                <button
                  type="button"
                  className="w-full text-left px-1.5 py-1 hover:bg-surface-container text-on-surface text-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate();
                  }}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="w-full text-left px-1.5 py-1 hover:bg-error-container text-error text-sm"
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
        <div className="space-y-1.5 mb-3">
          <Row
            label="Capacity"
            value={formatPlantCapacityKW(estimate.targetCapacityKW)}
          />
          <Row label="Grand total" value={`₹ ${formatINR(grandTotal)}`} />
          <Row label="Per kW" value={`₹ ${formatINR(perKwRate)}`} />
          <Row
            label="IRR"
            value={<span className="text-surface-tint">{irrLabel}</span>}
            last
          />
        </div>
      </div>
      <div className="bg-surface-container-low p-1.5 flex justify-between gap-1 border-t border-outline-variant">
        <button
          aria-label={inComparison ? 'Remove from comparison' : 'Add to comparison'}
          onClick={onToggleCompare}
          className={`p-1 transition-colors rounded-full ${
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
        <div className="flex gap-1">
          <button
            aria-label="Delete"
            onClick={onRemove}
            className="p-1 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error-container"
          >
            <Icon name="delete" />
          </button>
          <button
            aria-label="Duplicate"
            onClick={onDuplicate}
            className="p-1 text-on-surface-variant hover:text-secondary-container transition-colors rounded-full hover:bg-surface-container"
          >
            <Icon name="content_copy" />
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="px-2 py-1 bg-surface-tint text-on-primary rounded-lg font-body-md text-body-md hover:bg-primary-container transition-colors flex items-center gap-0.5"
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
      className={`flex justify-between ${last ? '' : 'border-b border-outline-variant pb-1'}`}
    >
      <span className="font-body-md text-body-md text-on-surface-variant">{label}</span>
      <span className="font-body-md text-body-md font-semibold">{value}</span>
    </div>
  );
}
