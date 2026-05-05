import { Switch } from '@/components/ui/Switch';

type Props = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

export function ToggleRow({ title, description, checked, onChange }: Props) {
  return (
    <div className="flex items-center justify-between py-xs border-b border-surface-variant/50 gap-md">
      <div className="flex flex-col">
        <span className="font-label-sm text-label-sm font-bold text-on-surface text-[14px]">
          {title}
        </span>
        <span className="font-body-md text-[13px] text-on-surface-variant">
          {description}
        </span>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
