import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

export function EmptyState() {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-lg text-center">
      <Icon name="solar_power" className="text-primary text-4xl" />
      <h3 className="font-headline-lg text-headline-lg mt-4">No scenarios yet</h3>
      <p className="font-body-md text-on-surface-variant mt-2">
        Create your first solar feasibility scenario to begin.
      </p>
      <Link
        to="/scenarios/new"
        className="inline-flex mt-4 h-touch-target items-center gap-2 bg-primary text-on-primary px-6 rounded-lg"
      >
        <Icon name="add" filled />
        New Scenario
      </Link>
    </div>
  );
}
