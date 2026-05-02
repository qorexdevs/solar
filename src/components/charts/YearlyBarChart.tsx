import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { compactINRParts, formatINR } from '@/lib/format';

type Props = {
  data: { year: number; net: number }[];
};

export function YearlyBarChart({ data }: Props) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
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
            formatter={(value: number) => [formatINR(value), 'Net cash flow']}
            labelFormatter={(label: number) => `Year ${label}`}
            contentStyle={{ borderRadius: 8, borderColor: '#bfc9c3', fontSize: 13 }}
          />
          <Bar dataKey="net" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.year} fill={d.net >= 0 ? '#003527' : '#ba1a1a'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
