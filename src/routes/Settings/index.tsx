import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BOMTab } from './BOMTab';
import { CatalogTab } from './CatalogTab';

type Tab = 'catalog' | 'bom';

export function Settings() {
  const [tab, setTab] = useState<Tab>('catalog');

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <h1 className="font-headline-xl text-headline-xl text-primary">Settings</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Manage the price catalog used for cost derivation and edit BOM templates per
          project type. New scenarios use the active catalog; existing scenarios stay
          frozen on the catalog they were saved with.
        </p>
      </div>

      <div className="flex border-b border-outline-variant/40">
        <TabButton active={tab === 'catalog'} onClick={() => setTab('catalog')}>
          <Icon name="receipt_long" className="text-[18px]" />
          Price Catalog
        </TabButton>
        <TabButton active={tab === 'bom'} onClick={() => setTab('bom')}>
          <Icon name="account_tree" className="text-[18px]" />
          BOM Templates
        </TabButton>
      </div>

      {tab === 'catalog' ? <CatalogTab /> : <BOMTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 h-touch-target inline-flex items-center gap-2 font-body-md text-body-md border-b-2 transition-colors ${
        active
          ? 'border-primary text-primary font-semibold'
          : 'border-transparent text-on-surface-variant hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
}
