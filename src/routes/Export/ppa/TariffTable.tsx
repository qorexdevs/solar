type Props = {
  schedule: number[];
};

export function TariffTable({ schedule }: Props) {
  const baseRate = schedule[0] ?? 0;
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/30">
      <table className="w-full text-left font-body-md">
        <thead className="bg-surface-container-low text-on-surface-variant">
          <tr>
            <th className="px-md py-sm font-label-sm text-label-sm font-semibold">Year</th>
            <th className="px-md py-sm font-label-sm text-label-sm font-semibold text-right">
              Tariff (₹/kWh)
            </th>
            <th className="px-md py-sm font-label-sm text-label-sm font-semibold text-right">
              vs Y1
            </th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((rate, i) => {
            const delta = baseRate > 0 ? ((rate - baseRate) / baseRate) * 100 : 0;
            return (
              <tr
                key={i}
                className="border-t border-outline-variant/30 hover:bg-surface-container-low/40"
              >
                <td className="px-md py-sm">Y{i + 1}</td>
                <td className="px-md py-sm text-right font-data-display">
                  ₹{rate.toFixed(3)}
                </td>
                <td className="px-md py-sm text-right text-on-surface-variant font-label-sm">
                  {i === 0 ? '—' : `+${delta.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
