import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE,
  downloadCatalogTemplate,
  parseCatalogFile,
} from '@/lib/catalog';
import { uid } from '@/lib/uid';
import { selectActiveCatalog, useSettingsStore } from '@/store/settings';
import { MATERIAL_KEYS } from '@/types';
import type { PriceCatalog } from '@/types';
import { CatalogDefaultsEditor } from './CatalogDefaultsEditor';
import { CatalogPriceTable } from './CatalogPriceTable';

export function CatalogTab() {
  const catalogs = useSettingsStore((s) => s.catalogs);
  const active = useSettingsStore(selectActiveCatalog);
  const setActive = useSettingsStore((s) => s.setActiveCatalog);
  const addCatalog = useSettingsStore((s) => s.addCatalog);
  const removeCatalog = useSettingsStore((s) => s.removeCatalog);
  const updateCatalog = useSettingsStore((s) => s.updateCatalog);
  const updateCatalogDefaults = useSettingsStore((s) => s.updateCatalogDefaults);
  const resetCatalogDefaults = useSettingsStore((s) => s.resetCatalogDefaults);
  const bom = useSettingsStore((s) => s.bomByProjectType.utility);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    errors: string[];
    warnings: string[];
    notice?: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedCatalogs = useMemo(
    () => [...catalogs].sort((a, b) => b.uploadedAt - a.uploadedAt),
    [catalogs]
  );

  async function onFileChosen(file: File) {
    setUploadStatus(null);
    const result = await parseCatalogFile(file);
    if (!result.catalog) {
      setUploadStatus({ errors: result.errors, warnings: result.warnings });
      return;
    }
    addCatalog(result.catalog, true);
    setUploadStatus({
      errors: [],
      warnings: result.warnings,
      notice: `Imported "${result.catalog.label}" and set it as active.`,
    });
  }

  function onAddManual() {
    const today = new Date().toISOString().slice(0, 10);
    const blank: PriceCatalog = {
      id: uid(`cat_${today}`),
      label: `Manual ${today}`,
      uploadedAt: Date.now(),
      source: 'manual',
      prices: Object.fromEntries(
        MATERIAL_KEYS.map((k) => [
          k,
          {
            unitPrice: active.prices[k]?.unitPrice ?? 0,
            unit: active.prices[k]?.unit ?? bom[k].unit,
          },
        ])
      ) as PriceCatalog['prices'],
      defaults: structuredClone(
        active.defaults ?? DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE
      ),
    };
    addCatalog(blank, false);
    setEditingId(blank.id);
  }

  return (
    <div className="flex flex-col gap-md">
      <section className="bg-surface-container-lowest rounded-xl p-md shadow-card flex flex-col gap-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Active catalog
            </p>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              {active.label}
            </h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
              {sourceLabel(active.source)} · uploaded{' '}
              {new Date(active.uploadedAt).toLocaleString()}
              {active.notes ? ` · ${active.notes}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-sm">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFileChosen(f);
                e.target.value = '';
              }}
            />
            <Button
              variant="primary"
              iconLeft={<Icon name="upload" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload catalog
            </Button>
            <Button
              variant="outline"
              iconLeft={<Icon name="download" />}
              onClick={() =>
                downloadCatalogTemplate(
                  bom,
                  active.defaults ?? DEFAULT_CATALOG_DEFAULTS_BY_PROJECT_TYPE
                )
              }
            >
              Download template
            </Button>
            <Button variant="ghost" iconLeft={<Icon name="add" />} onClick={onAddManual}>
              New manual catalog
            </Button>
          </div>
        </div>

        {uploadStatus && (
          <div
            className={`rounded-lg p-sm border text-body-md ${
              uploadStatus.errors.length > 0
                ? 'border-error/40 bg-error-container/40 text-on-error-container'
                : 'border-primary/30 bg-primary-fixed/30 text-on-surface'
            }`}
          >
            {uploadStatus.notice && (
              <p className="font-semibold">{uploadStatus.notice}</p>
            )}
            {uploadStatus.errors.length > 0 && (
              <ul className="list-disc ml-md mt-1">
                {uploadStatus.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            {uploadStatus.warnings.length > 0 && (
              <ul className="list-disc ml-md mt-1 opacity-80">
                {uploadStatus.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <CatalogPriceTable
          catalog={active}
          editable={editingId === active.id}
          onCommit={(patch) => updateCatalog(active.id, patch)}
        />
        <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant/30">
          {editingId === active.id ? (
            <Button
              variant="primary"
              iconLeft={<Icon name="check" />}
              onClick={() => setEditingId(null)}
            >
              Done editing
            </Button>
          ) : (
            <Button
              variant="ghost"
              iconLeft={<Icon name="edit" />}
              onClick={() => setEditingId(active.id)}
            >
              Edit prices manually
            </Button>
          )}
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl p-md shadow-card flex flex-col gap-sm">
        <div className="flex flex-col gap-1">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Scenario defaults by project type
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            New scenarios pull these values from the active catalog. Per-type so the
            simplified builder gets reasonable lifespan, CUF, O&amp;M and escalation
            without asking the user.
          </p>
        </div>
        <CatalogDefaultsEditor
          catalog={active}
          onChange={(type, patch) => updateCatalogDefaults(active.id, type, patch)}
          onResetType={(type) => resetCatalogDefaults(active.id, type)}
        />
      </section>

      <section className="bg-surface-container-lowest rounded-xl p-md shadow-card flex flex-col gap-sm">
        <h3 className="font-headline-md text-headline-md text-on-surface">History</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Older catalogs stay around so existing scenarios can keep referencing them.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-body-md">
            <thead>
              <tr className="text-left text-on-surface-variant border-b border-outline-variant/30">
                <th className="py-2 pr-2">Label</th>
                <th className="py-2 pr-2">Source</th>
                <th className="py-2 pr-2">Uploaded</th>
                <th className="py-2 pr-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {sortedCatalogs.map((c) => {
                const isActive = c.id === active.id;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-outline-variant/20 last:border-b-0"
                  >
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface">{c.label}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-on-surface-variant">
                      {sourceLabel(c.source)}
                    </td>
                    <td className="py-2 pr-2 text-on-surface-variant">
                      {new Date(c.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <div className="flex justify-end gap-2">
                        {!isActive && (
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => setActive(c.id)}
                          >
                            Set active
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={() => setEditingId(c.id)}
                        >
                          {editingId === c.id ? 'Editing…' : 'Edit'}
                        </Button>
                        {!isActive && c.source !== 'legacy' && (
                          <Button
                            variant="ghost"
                            size="md"
                            onClick={() => removeCatalog(c.id)}
                          >
                            <Icon name="delete" className="text-[18px]" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedCatalogs
          .filter((c) => editingId === c.id && c.id !== active.id)
          .map((c) => (
            <div
              key={c.id}
              className="border border-outline-variant/30 rounded-lg p-sm flex flex-col gap-sm"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-body-lg text-body-lg text-on-surface font-semibold">
                  Editing: {c.label}
                </h4>
                <Button
                  variant="primary"
                  iconLeft={<Icon name="check" />}
                  onClick={() => setEditingId(null)}
                >
                  Done editing
                </Button>
              </div>
              <CatalogPriceTable
                catalog={c}
                editable
                onCommit={(patch) => updateCatalog(c.id, patch)}
              />
            </div>
          ))}
      </section>
    </div>
  );
}

function sourceLabel(source: PriceCatalog['source']): string {
  switch (source) {
    case 'upload':
      return 'Excel/CSV upload';
    case 'manual':
      return 'Manual entry';
    case 'seed':
      return 'Starter prices';
    case 'legacy':
      return 'Pre-v2 legacy';
  }
}
