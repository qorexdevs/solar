import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { compactINRParts, formatINR } from '@/lib/format';

type Props = {
  data: { year: number; cumulative: number; netPosition?: number }[];
  breakEvenYear: number | null;
  /** Show the Net Position series (cumulative CF + loan principal paid down). */
  showNetPosition?: boolean;
};

const SERIES_LABELS: Record<string, string> = {
  cumulative: 'Cumulative CF',
  netPosition: 'Net Position',
};

export function CashFlowChart({ data, breakEvenYear, showNetPosition = false }: Props) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="cfGradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#003527" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#003527" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="cfGradNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ba1a1a" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#ba1a1a" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="netPosGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7d5260" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7d5260" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#bfc9c3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#707974', fontSize: 12 }}
            tickFormatter={(v) => `Y${v}`}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#707974', fontSize: 12 }}
            tickFormatter={(v) => {
              const { sign, number, unit } = compactINRParts(v);
              return `${sign}₹${number}${unit ? ' ' + unit : ''}`;
            }}
            width={70}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatINR(value),
              SERIES_LABELS[name] ?? name,
            ]}
            labelFormatter={(label: number) => `Year ${label}`}
            contentStyle={{
              borderRadius: 8,
              borderColor: '#bfc9c3',
              fontSize: 13,
            }}
          />
          {showNetPosition && (
            <Legend
              verticalAlign="top"
              height={28}
              iconType="circle"
              wrapperStyle={{ fontSize: 12 }}
              formatter={(name: string) => SERIES_LABELS[name] ?? name}
            />
          )}
          <ReferenceLine y={0} stroke="#404944" strokeDasharray="4 4" />
          {breakEvenYear !== null && (
            <ReferenceLine
              x={breakEvenYear}
              stroke="#2b6954"
              strokeWidth={1.5}
              label={{
                value: `Break-even Y${breakEvenYear}`,
                fill: '#2b6954',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="cumulative"
            name="cumulative"
            stroke="#003527"
            strokeWidth={2}
            fill="url(#cfGradPos)"
            isAnimationActive={false}
          />
          {showNetPosition && (
            <Area
              type="monotone"
              dataKey="netPosition"
              name="netPosition"
              stroke="#7d5260"
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="url(#netPosGrad)"
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
