import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';

const LINKS: {
  to: string;
  icon: ComponentProps<typeof Icon>['name'];
  title: string;
  hint: string;
}[] =
  [
    {
      to: '/templates',
      icon: 'library_books',
      title: 'Templates',
      hint: 'Scenario templates and line structures',
    },
    {
      to: '/catalog',
      icon: 'inventory_2',
      title: 'Catalog',
      hint: 'Material catalog and BOM',
    },
  ];

export function Settings() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-headline-lg text-headline-lg mb-lg">Settings</h1>
      <p className="text-body-md text-on-surface-variant mb-lg">
        Configure templates and catalog data used across estimates.
      </p>
      <ul className="flex flex-col gap-sm">
        {LINKS.map((row) => (
          <li key={row.to}>
            <Link
              to={row.to}
              className="flex items-center gap-md rounded-xl border border-outline-variant/50 bg-surface-container-low p-md hover:border-primary/40 hover:bg-surface-container transition-colors active:opacity-90"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-variant text-primary">
                <Icon name={row.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-title-md text-title-md text-on-surface">{row.title}</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">{row.hint}</div>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
