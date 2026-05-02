type Props = { label: string; value: string };

export function PreviewRow({ label, value }: Props) {
  return (
    <div className="flex justify-between items-center text-body-md text-on-surface-variant">
      <span>{label}</span>
      <span className="font-bold text-on-surface text-right max-w-[60%] truncate">
        {value}
      </span>
    </div>
  );
}
