import { useSearchParams } from 'react-router-dom';
import { PillTab } from '@/components/ui/PillTab';
import { EstimatesPanel } from './EstimatesPanel';
import { PPARatesPanel } from './PPARatesPanel';

type CompareTab = 'estimates' | 'ppa';

function parseTab(raw: string | null): CompareTab {
  return raw === 'ppa' ? 'ppa' : 'estimates';
}

export function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));

  function setTab(next: CompareTab) {
    setSearchParams({ tab: next }, { replace: true });
  }

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-xl text-headline-xl text-on-background">
          Compare
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {tab === 'estimates'
            ? 'Pick estimates to compare side-by-side, including IRR, NPV and payback when finance is enabled.'
            : 'Pick one estimate and see how IRR, NPV and payback move as you sweep the PPA tariff.'}
        </p>
      </div>

      <div className="flex bg-surface-container-low p-xs rounded-lg border border-outline-variant/50 gap-0">
        <PillTab
          active={tab === 'estimates'}
          icon="compare_arrows"
          label="Estimates"
          onClick={() => setTab('estimates')}
        />
        <PillTab
          active={tab === 'ppa'}
          icon="payments"
          label="PPA Rate"
          onClick={() => setTab('ppa')}
        />
      </div>

      {tab === 'estimates' ? <EstimatesPanel /> : <PPARatesPanel />}
    </div>
  );
}
