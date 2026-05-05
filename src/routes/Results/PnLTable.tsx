import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { FinanceResults } from '@/lib/calc';
import { formatINR } from '@/lib/format';

type Props = { finance: FinanceResults };

export function PnLTable({ finance }: Props) {
  const rows = finance.pnl;
  const [isOpen, setIsOpen] = useState(true);

  // Cumulative columns shown beside each year's number, in lighter ink.
  // Net CF is intentionally excluded since the dedicated Cumulative CF column
  // to the right already tracks the running total (with -equity baseline).
  const cumulative = useMemo(() => {
    const cumRev: number[] = [];
    const cumOM: number[] = [];
    let aR = 0;
    let aO = 0;
    for (const r of rows) {
      aR += r.revenue;
      aO += r.om;
      cumRev.push(aR);
      cumOM.push(aO);
    }
    return { cumRev, cumOM };
  }, [rows]);

  return (
    <section className="bg-surface-container-lowest rounded-xl p-lg shadow-card space-y-lg">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1">
        <div className="flex items-center gap-1.5">
          <h3 className="font-body-lg text-body-lg text-on-surface">P&amp;L by Year</h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {rows.length} years
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls="pnl-table-body"
          className="text-primary font-label-sm text-label-sm flex items-center gap-0.5 self-start md:self-auto"
        >
          <Icon name={isOpen ? 'expand_less' : 'expand_more'} className="text-[18px]" />
          {isOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isOpen && (
        <div id="pnl-table-body" className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="border-b border-outline-variant font-label-sm text-label-sm text-outline">
                <th className="py-1 pr-2 font-medium sticky left-0 bg-surface-container-lowest">
                  Year
                </th>
                <th className="py-1 px-1.5 font-medium text-right">
                  Revenue
                  <div className="text-[10px] text-outline/70 font-normal normal-case">
                    year · cumulative
                  </div>
                </th>
                <th className="py-1 px-1.5 font-medium text-right">
                  O&amp;M
                  <div className="text-[10px] text-outline/70 font-normal normal-case">
                    year · cumulative
                  </div>
                </th>
                <th className="py-1 px-1.5 font-medium text-right">
                  Loan
                  <div className="text-[10px] text-outline/70 font-normal normal-case">
                    year · balance
                  </div>
                </th>
                <th className="py-1 px-1.5 font-medium text-right">Net CF</th>
                <th className="py-1 px-1.5 font-medium text-right">Cumulative CF</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-label-sm">
              {rows.map((r, i) => (
                <tr key={r.year} className="border-b border-outline-variant/50">
                  <td className="py-1.5 pr-2 text-on-surface font-medium sticky left-0 bg-surface-container-lowest">
                    Y{r.year}
                  </td>
                  <PnLCell
                    primary={formatINR(r.revenue)}
                    secondary={formatINR(cumulative.cumRev[i])}
                    primaryClass="text-tertiary-container"
                  />
                  <PnLCell
                    primary={formatINR(-r.om)}
                    secondary={formatINR(-cumulative.cumOM[i])}
                    primaryClass="text-error"
                  />
                  <PnLCell
                    primary={r.loanPayment > 0 ? formatINR(-r.loanPayment) : '—'}
                    secondary={r.loanBalance > 0.5 ? formatINR(r.loanBalance) : '₹0'}
                    primaryClass="text-error"
                  />
                  <PnLCell
                    primary={formatINR(r.netCashFlow)}
                    primaryClass={`font-semibold ${
                      r.netCashFlow >= 0 ? 'text-primary' : 'text-error'
                    }`}
                  />
                  <td
                    className={`py-1.5 px-1.5 text-right ${
                      r.cumulativeCashFlow >= 0 ? 'text-primary' : 'text-error'
                    }`}
                  >
                    {formatINR(r.cumulativeCashFlow)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PnLCell({
  primary,
  secondary,
  primaryClass,
}: {
  primary: string;
  secondary?: string;
  primaryClass?: string;
}) {
  return (
    <td className="py-1.5 px-1.5 text-right">
      <div className="flex justify-end items-baseline gap-1">
        <span className={primaryClass}>{primary}</span>
        {secondary !== undefined && (
          <span className="text-[10px] text-outline/70">{secondary}</span>
        )}
      </div>
    </td>
  );
}
