import { Icon } from '@/components/ui/Icon';

type Props = {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
};

export function PillTab({ active, icon, label, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex justify-center items-center gap-xs py-md h-touch-target rounded transition-all ${
        active
          ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
          : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      <Icon name={icon} filled={active} />
      <span className="font-label-sm text-label-sm">{label}</span>
    </button>
  );
}
