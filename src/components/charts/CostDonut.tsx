import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatINR } from '@/lib/format';

type Slice = { id: string; name: string; value: number };

type Props = {
  slices: Slice[];
};

const PALETTE = [
  '#003527',
  '#316bf3',
  '#2b6954',
  '#95d3ba',
  '#0051d5',
  '#6bd8cb',
  '#80bea6',
  '#b4c5ff',
  '#bfc9c3',
];

export function CostDonut({ slices }: Props) {
  const data = slices.filter((s) => s.value > 0);
  const total = data.reduce((acc, s) => acc + s.value, 0);

  if (total === 0) {
    return (
      <div className="text-on-surface-variant text-center py-md">
        Add costs to see the breakdown.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="h-[180px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={1}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.id} fill={PALETTE[i % PALETTE.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name) => [formatINR(v), name as string]}
              contentStyle={{
                borderRadius: 8,
                borderColor: '#bfc9c3',
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2">
        {data.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <li
              key={d.id}
              className="flex justify-between items-center font-label-sm text-label-sm"
            >
              <span className="flex items-center gap-2 text-on-surface">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                {d.name} ({pct.toFixed(0)}%)
              </span>
              <span className="font-medium text-on-surface">{formatINR(d.value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
