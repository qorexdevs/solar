import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  BOM_CATEGORIES,
  BOM_CATEGORY_LABELS,
  BOM_UOMS,
  type BOMCategory,
  type BOMUom,
  type MaterialCatalogItem,
} from '@/types';
import {
  parseBomSheet,
  type BomImportResult,
  type BomImportRow,
} from '@/lib/catalog/importBom';
import { uid } from '@/lib/uid';
import { formatINR } from '@/lib/format';

type Props = {
  catalog: MaterialCatalogItem[];
  onClose: () => void;
  /** Called when the user confirms — creates new items + updates existing ones. */
  onApply: (changes: BomImportApply) => void;
};

export type BomImportRowDecision =
  | { row: BomImportRow; action: 'skip' }
  | { row: BomImportRow; action: 'create'; newItem: MaterialCatalogItem }
  | {
      row: BomImportRow;
      action: 'merge';
      existingId: string;
      patch: Partial<MaterialCatalogItem>;
    };

export type BomImportApply = {
  decisions: BomImportRowDecision[];
  result: BomImportResult;
};

/**
 * Three-step dialog: pick file → review parsed rows → apply.
 */
export function BomImportDialog({ catalog, onClose, onApply }: Props) {
  const [parsed, setParsed] = useState<BomImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Map<string, BomImportRowDecision>>(
    new Map()
  );

  async function handleFile(file: File) {
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        setError('Workbook contains no sheets.');
        return;
      }
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: null,
        blankrows: false,
      });
      const result = parseBomSheet(raw, catalog);
      if (result.rows.length === 0) {
        setError(
          'No BOM rows detected. Expected a header row with "Sl no | Description | Make | UOM | Qty | Rate | Amount | GST".'
        );
      }
      setParsed(result);
      setDecisions(seedDecisions(result.rows));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to read the workbook.'
      );
    }
  }

  function setDecision(rowId: string, decision: BomImportRowDecision) {
    const next = new Map(decisions);
    next.set(rowId, decision);
    setDecisions(next);
  }

  const summary = useMemo(() => summarize(decisions), [decisions]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-scrim/50 p-md"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl bg-surface-container-lowest rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">
              Import BOM from spreadsheet
            </h2>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Accepts .xlsx / .xls / .csv. Use the sample format from
              <code className="ml-0.5">docs/Project costing details _MW.xlsx</code>.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-0.5 hover:bg-surface-container-low"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-lg py-md flex flex-col gap-md">
          {!parsed ? (
            <FilePicker onFile={handleFile} error={error} />
          ) : (
            <PreviewTable
              parsed={parsed}
              catalog={catalog}
              decisions={decisions}
              onDecision={setDecision}
            />
          )}
        </div>

        {parsed && (
          <div className="flex items-center justify-between gap-md px-lg py-md border-t border-outline-variant bg-surface-container-low">
            <div className="text-body-sm font-body-sm text-on-surface-variant">
              {summary.create} new · {summary.merge} merge · {summary.skip} skipped
            </div>
            <div className="flex gap-md">
              <Button
                variant="ghost"
                onClick={() => {
                  setParsed(null);
                  setDecisions(new Map());
                }}
              >
                Pick another file
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={summary.create + summary.merge === 0}
                onClick={() =>
                  onApply({
                    result: parsed,
                    decisions: [...decisions.values()],
                  })
                }
              >
                Apply {summary.create + summary.merge} changes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilePicker({
  onFile,
  error,
}: {
  onFile: (file: File) => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-md py-2xl">
      <Icon name="upload_file" className="text-headline-lg text-primary" />
      <p className="text-body-md font-body-md text-on-surface text-center max-w-md">
        Drop your BOM workbook here, or browse below. The first sheet will be
        parsed; "Other Scope Of Works" sections are detected automatically.
      </p>
      <label className="inline-flex items-center gap-0.5 rounded-lg bg-primary text-on-primary px-2 py-1 cursor-pointer">
        <Icon name="folder_open" /> Choose file
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>
      {error && (
        <div className="rounded-lg border border-error bg-error/10 px-md py-md text-body-sm font-body-sm text-on-surface">
          {error}
        </div>
      )}
    </div>
  );
}

function PreviewTable({
  parsed,
  catalog,
  decisions,
  onDecision,
}: {
  parsed: BomImportResult;
  catalog: MaterialCatalogItem[];
  decisions: Map<string, BomImportRowDecision>;
  onDecision: (rowId: string, decision: BomImportRowDecision) => void;
}) {
  return (
    <div className="flex flex-col gap-md">
      {parsed.title && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-md">
          <div className="font-title-md text-title-md text-on-surface">
            {parsed.title}
          </div>
          <div className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 flex flex-wrap gap-md">
            {parsed.inferredBaseCapacityKW && (
              <span>Inferred base: {parsed.inferredBaseCapacityKW} kW</span>
            )}
            {parsed.inferredSyncType && (
              <span>Sync type: {parsed.inferredSyncType}</span>
            )}
            {parsed.inferredMounting && (
              <span>Mounting: {parsed.inferredMounting}</span>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full text-left text-body-sm font-body-sm">
          <thead className="bg-surface-container-low text-on-surface-variant">
            <tr>
              <th className="px-1 py-1">Action</th>
              <th className="px-1 py-1">Description</th>
              <th className="px-1 py-1">Qty / Amount</th>
              <th className="px-1 py-1">Rate</th>
              <th className="px-1 py-1">Category</th>
              <th className="px-1 py-1">UOM</th>
              <th className="px-1 py-1">Match</th>
              <th className="px-1 py-1">Warnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {parsed.rows.map((row) => (
              <ImportRow
                key={row.rowId}
                row={row}
                catalog={catalog}
                decision={decisions.get(row.rowId)}
                onDecision={(d) => onDecision(row.rowId, d)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportRow({
  row,
  catalog,
  decision,
  onDecision,
}: {
  row: BomImportRow;
  catalog: MaterialCatalogItem[];
  decision: BomImportRowDecision | undefined;
  onDecision: (d: BomImportRowDecision) => void;
}) {
  const action = decision?.action ?? 'skip';
  const matched = catalog.find(
    (c) =>
      c.id ===
      (decision?.action === 'merge'
        ? decision.existingId
        : row.matchedCatalogId)
  );

  function chooseAction(next: BomImportRowDecision['action']) {
    if (next === 'skip') {
      onDecision({ row, action: 'skip' });
    } else if (next === 'create') {
      onDecision({ row, action: 'create', newItem: rowToNewItem(row) });
    } else {
      const existing = matched ?? catalog[0];
      if (!existing) {
        onDecision({ row, action: 'skip' });
        return;
      }
      onDecision({
        row,
        action: 'merge',
        existingId: existing.id,
        patch: rowToMergePatch(row),
      });
    }
  }

  return (
    <tr className="align-top">
      <td className="px-1 py-1">
        <div className="flex flex-col gap-0.5">
          <ActionRadio
            label="Create"
            checked={action === 'create'}
            onChange={() => chooseAction('create')}
          />
          <ActionRadio
            label="Merge"
            checked={action === 'merge'}
            disabled={!row.matchedCatalogId && catalog.length === 0}
            onChange={() => chooseAction('merge')}
          />
          <ActionRadio
            label="Skip"
            checked={action === 'skip'}
            onChange={() => chooseAction('skip')}
          />
        </div>
      </td>
      <td className="px-1 py-1 max-w-[260px]">
        <div className="font-body-md text-body-md text-on-surface">{row.name}</div>
        {row.group && (
          <div className="text-[11px] text-on-surface-variant">{row.group}</div>
        )}
        {row.make && (
          <div className="text-[11px] text-on-surface-variant">
            Make: {row.make}
          </div>
        )}
      </td>
      <td className="px-1 py-1 whitespace-nowrap">
        {row.kind === 'bom'
          ? row.quantity != null
            ? row.quantity.toLocaleString('en-IN')
            : '—'
          : row.amount != null
            ? formatINR(row.amount)
            : '—'}
      </td>
      <td className="px-1 py-1 whitespace-nowrap">
        {row.rate != null ? formatINR(row.rate) : '—'}
      </td>
      <td className="px-1 py-1">
        <span className="font-label-sm text-label-sm">
          {BOM_CATEGORY_LABELS[row.category]}
        </span>
      </td>
      <td className="px-1 py-1">
        {row.kind === 'bom' ? (
          <span className="font-label-sm text-label-sm">
            {row.uom ?? <em>{row.rawUom ?? '—'}</em>}
          </span>
        ) : (
          <span className="font-label-sm text-label-sm">—</span>
        )}
      </td>
      <td className="px-1 py-1 max-w-[180px]">
        {action === 'merge' ? (
          <select
            className="w-full rounded border border-outline-variant bg-surface-container-low px-0.5 py-0.5 text-[12px]"
            value={
              decision?.action === 'merge'
                ? decision.existingId
                : (matched?.id ?? '')
            }
            onChange={(e) =>
              onDecision({
                row,
                action: 'merge',
                existingId: e.target.value,
                patch: rowToMergePatch(row),
              })
            }
          >
            {catalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : matched ? (
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {matched.name}
          </span>
        ) : (
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            no match
          </span>
        )}
      </td>
      <td className="px-1 py-1">
        {row.warnings.length > 0 ? (
          <ul className="text-[11px] text-on-surface-variant">
            {row.warnings.map((w, idx) => (
              <li key={`${row.rowId}-${idx}`}>{w}</li>
            ))}
          </ul>
        ) : (
          <span className="text-[11px] text-on-surface-variant">—</span>
        )}
      </td>
    </tr>
  );
}

function ActionRadio({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-0.5 font-label-sm text-label-sm text-on-surface">
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

function rowToNewItem(row: BomImportRow): MaterialCatalogItem {
  const now = Date.now();
  const base = {
    id: uid('cat'),
    name: row.name,
    description: row.group ? `${row.group} — ${row.name}` : row.name,
    make: row.make,
    category: (BOM_CATEGORIES as readonly string[]).includes(row.category)
      ? row.category
      : ('misc' as BOMCategory),
    gstPercent: row.gstPercent ?? 18,
    defaultComposeMode: 'max' as const,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  };
  if (row.kind === 'bom') {
    return {
      ...base,
      kind: 'bom',
      uom: (row.uom ??
        ((BOM_UOMS as readonly string[]).includes('count')
          ? 'count'
          : 'count')) as BOMUom,
      defaultRate: row.rate ?? 0,
    };
  }
  return {
    ...base,
    kind: 'scope',
    defaultAmount: row.amount ?? 0,
  };
}

function rowToMergePatch(row: BomImportRow): Partial<MaterialCatalogItem> {
  const patch: Partial<MaterialCatalogItem> = {
    updatedAt: Date.now(),
  };
  if (row.kind === 'bom') {
    if (row.rate != null) patch.defaultRate = row.rate;
    if (row.uom) patch.uom = row.uom;
  } else if (row.amount != null) {
    patch.defaultAmount = row.amount;
  }
  if (row.gstPercent != null) patch.gstPercent = row.gstPercent;
  if (row.make) patch.make = row.make;
  return patch;
}

function seedDecisions(
  rows: BomImportRow[]
): Map<string, BomImportRowDecision> {
  const out = new Map<string, BomImportRowDecision>();
  for (const row of rows) {
    if (row.matchedCatalogId) {
      out.set(row.rowId, {
        row,
        action: 'merge',
        existingId: row.matchedCatalogId,
        patch: rowToMergePatch(row),
      });
    } else {
      out.set(row.rowId, { row, action: 'create', newItem: rowToNewItem(row) });
    }
  }
  return out;
}

function summarize(decisions: Map<string, BomImportRowDecision>): {
  create: number;
  merge: number;
  skip: number;
} {
  let create = 0,
    merge = 0,
    skip = 0;
  for (const d of decisions.values()) {
    if (d.action === 'create') create++;
    else if (d.action === 'merge') merge++;
    else skip++;
  }
  return { create, merge, skip };
}
