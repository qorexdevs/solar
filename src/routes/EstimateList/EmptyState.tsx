import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

export function EmptyState() {
  return (
    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl p-lg text-center">
      <Icon name="solar_power" className="text-primary text-4xl" />
      <h3 className="font-headline-lg text-headline-lg mt-4">No estimates yet</h3>
      <p className="font-body-md text-on-surface-variant mt-2">
        Pick a Scenario Template, set a target capacity, and the system scales
        the BOM into a customer-ready estimate.
      </p>
      <div className="flex justify-center gap-sm mt-4">
        <Link
          to="/templates"
          className="inline-flex h-touch-target items-center gap-2 border border-outline-variant text-on-surface px-6 rounded-lg hover:bg-surface-container"
        >
          <Icon name="library_books" />
          Browse templates
        </Link>
        <Link
          to="/estimates/new"
          className="inline-flex h-touch-target items-center gap-2 bg-primary text-on-primary px-6 rounded-lg"
        >
          <Icon name="add" filled />
          New estimate
        </Link>
      </div>
    </div>
  );
}
