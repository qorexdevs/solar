import { Icon } from '@/components/ui/Icon';

type Props = {
  disabled: boolean;
  onClick: () => void;
};

export function ResetButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-label-sm text-label-sm flex items-center gap-1 transition-colors ${
        disabled
          ? 'text-outline opacity-50 cursor-not-allowed'
          : 'text-primary hover:text-primary-container'
      }`}
    >
      <Icon name="restart_alt" className="text-[16px]" />
      Reset
    </button>
  );
}
