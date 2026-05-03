import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { compactINRParts, formatINR } from '@/lib/format';

type Series = { id: string; name: string; color: string };
export type Row = { year: number; [key: string]: number };

type Props = {
  data: Row[];
  series: Series[];
  /**
   * When set, each data row may include `${series.id}${suffix}` with annual
   * net equity cash flow; the tooltip shows cumulative + annual net per scenario.
   */
  annualNetSuffix?: string;
};

const TOOLTIP_CONTENT_STYLE = {
  borderRadius: 8,
  borderColor: '#bfc9c3',
  fontSize: 13,
} as const;

function AnnualNetTooltip({
  active,
  label,
  payload,
  series,
  suffix,
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ payload?: Row }>;
  series: Series[];
  suffix: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Row | undefined;
  if (!row || label === undefined || label === null) return null;

  return (
    <div
      className="rounded-lg border bg-surface p-2 shadow-sm text-on-surface"
      style={{ borderColor: TOOLTIP_CONTENT_STYLE.borderColor, fontSize: 13 }}
    >
      <p className="font-semibold mb-2">Year {label}</p>
      <ul className="space-y-2 m-0 p-0 list-none">
        {series.map((s) => {
          const cum = row[s.id];
          const netKey = `${s.id}${suffix}`;
          const net = row[netKey];
          const hasNet = typeof net === 'number' && Number.isFinite(net);
          return (
            <li key={s.id}>
              <div className="flex items-center gap-2 font-medium text-body-md">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="truncate">{s.name}</span>
              </div>
              <div className="pl-4 mt-0.5 text-label-sm text-on-surface-variant space-y-0.5">
                <div>Cumulative: {formatINR(typeof cum === 'number' ? cum : NaN)}</div>
                {hasNet && <div>Annual net: {formatINR(net)}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MultiCashFlowChart({ data, series, annualNetSuffix }: Props) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#bfc9c3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#707974', fontSize: 12 }}
            tickFormatter={(v) => `Y${v}`}
          />
          <YAxis
            tick={{ fill: '#707974', fontSize: 12 }}
            tickFormatter={(v) => {
              const { sign, number, unit } = compactINRParts(v);
              return `${sign}₹${number}${unit ? ' ' + unit : ''}`;
            }}
            width={70}
          />
          {annualNetSuffix ? (
            <Tooltip
              content={(props) => (
                <AnnualNetTooltip {...props} series={series} suffix={annualNetSuffix} />
              )}
            />
          ) : (
            <Tooltip
              formatter={(value: number, name) => [formatINR(value), name as string]}
              labelFormatter={(l: number) => `Year ${l}`}
              contentStyle={TOOLTIP_CONTENT_STYLE}
            />
          )}
          <ReferenceLine y={0} stroke="#404944" strokeDasharray="4 4" />
          {series.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
