import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

type Props = {
  title: string;
  subtitle?: string;
  onExport: () => void;
  onSave: () => void;
};

/**
 * Title + subtitle on the left; Export PDF + Save Estimate buttons on the
 * right. Mobile collapses the buttons under the title.
 */
export function EstimateActionsBar({
  title,
  subtitle,
  onExport,
  onSave,
}: Props) {
  return (
    <div className="flex flex-col gap-md md:flex-row md:items-start md:justify-between md:gap-lg">
      <div className="flex flex-col gap-0.5 min-w-0">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
          {title}
        </h1>
        {subtitle && (
          <p className="font-body-md text-body-md text-on-surface-variant">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex flex-row items-center gap-md flex-wrap">
        <Button
          variant="outline"
          onClick={onExport}
          iconLeft={<Icon name="download" />}
        >
          Export PDF
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          iconLeft={<Icon name="save" />}
        >
          Save Estimate
        </Button>
      </div>
    </div>
  );
}
