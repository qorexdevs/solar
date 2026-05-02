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
};

export function MultiCashFlowChart({ data, series }: Props) {
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
          <Tooltip
            formatter={(value: number, name) => [formatINR(value), name as string]}
            labelFormatter={(label: number) => `Year ${label}`}
            contentStyle={{ borderRadius: 8, borderColor: '#bfc9c3', fontSize: 13 }}
          />
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
