import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { IrradianceRecord, YieldResult } from '@/types';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  borderColor: '#bfc9c3',
  fontSize: 13,
} as const;

/* ------------------------------------------------------------------ *
 * 365-day daily-typical-year line
 * ------------------------------------------------------------------ */

type DailyProps = { dailyTypicalYear: number[] };

export function DailyClimatologyChart({ dailyTypicalYear }: DailyProps) {
  const data = dailyTypicalYear.map((v, i) => ({ doy: i + 1, ghi: v }));
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid stroke="#bfc9c3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="doy"
            tick={{ fill: '#707974', fontSize: 11 }}
            ticks={[1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]}
            tickFormatter={(d) => {
              const idx = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335].indexOf(d);
              return idx >= 0 ? MONTHS[idx] : '';
            }}
          />
          <YAxis
            tick={{ fill: '#707974', fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(1)}`}
            width={36}
            label={{
              value: 'kWh/m²/day',
              angle: -90,
              position: 'insideLeft',
              fill: '#707974',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => [`${v.toFixed(2)} kWh/m²/day`, 'GHI']}
            labelFormatter={(d: number) => `Day ${d}`}
          />
          <Area
            type="monotone"
            dataKey="ghi"
            stroke="#003527"
            fill="#a6f2c1"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Monthly bar with stdev whiskers + monsoon-uncertainty band
 * ------------------------------------------------------------------ */

type MonthlyProps = {
  monthlyGHI: number[];
  monthlyPOA: number[];
  monthlyStdev: number[];
  monsoonMonths: number[];
};

export function MonthlyBarChart({
  monthlyGHI,
  monthlyPOA,
  monthlyStdev,
  monsoonMonths,
}: MonthlyProps) {
  const data = MONTHS.map((label, m) => ({
    month: label,
    idx: m,
    ghi: monthlyGHI[m],
    poa: monthlyPOA[m],
    stdev: monthlyStdev[m] ?? 0,
  }));
  const monsoonStart = MONTHS[Math.min(...monsoonMonths)];
  const monsoonEnd = MONTHS[Math.max(...monsoonMonths)];

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid stroke="#bfc9c3" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#707974', fontSize: 11 }} />
          <YAxis
            tick={{ fill: '#707974', fontSize: 11 }}
            width={40}
            label={{
              value: 'kWh/m²/day',
              angle: -90,
              position: 'insideLeft',
              fill: '#707974',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number, name: string) => [
              `${v.toFixed(2)} kWh/m²/day`,
              name === 'ghi' ? 'GHI' : 'POA',
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceArea
            x1={monsoonStart}
            x2={monsoonEnd}
            strokeOpacity={0}
            fill="#1976d2"
            fillOpacity={0.08}
            label={{
              value: 'Monsoon — higher uncertainty',
              position: 'insideTop',
              fill: '#1976d2',
              fontSize: 11,
            }}
          />
          <Bar dataKey="ghi" name="GHI" fill="#a6f2c1" radius={[3, 3, 0, 0]}>
            <ErrorBar dataKey="stdev" stroke="#003527" strokeWidth={1.5} />
          </Bar>
          <Line
            type="monotone"
            dataKey="poa"
            name="POA"
            stroke="#003527"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Composite section
 * ------------------------------------------------------------------ */

type SectionProps = {
  yieldResult: YieldResult;
  record: IrradianceRecord;
};

export function IrradianceCharts({ yieldResult, record }: SectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
      <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
        <h4 className="font-body-lg text-body-lg text-on-surface mb-2">
          Daily climatology — typical year
        </h4>
        <DailyClimatologyChart
          dailyTypicalYear={yieldResult.dailyTypicalYear}
        />
      </section>
      <section className="bg-surface-container-lowest rounded-xl p-md shadow-card">
        <h4 className="font-body-lg text-body-lg text-on-surface mb-2">
          Monthly GHI vs POA
        </h4>
        <MonthlyBarChart
          monthlyGHI={yieldResult.monthlyGHI}
          monthlyPOA={yieldResult.monthlyPOA}
          monthlyStdev={record.monthly.stdev}
          monsoonMonths={yieldResult.monsoonUncertainty.months}
        />
      </section>
    </div>
  );
}
