import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useEstimateStore } from '@/store/estimates';

const NAV = [
  { to: '/', icon: 'analytics', label: 'Estimates', kind: 'list' as const },
  { to: '/templates', icon: 'library_books', label: 'Templates', kind: 'templates' as const },
  { to: '/catalog', icon: 'inventory_2', label: 'Catalog', kind: 'catalog' as const },
  { to: '/results', icon: 'insights', label: 'Results', kind: 'results' as const },
  { to: '/compare', icon: 'compare_arrows', label: 'Compare', kind: 'compare' as const },
  { to: '/export', icon: 'ios_share', label: 'Export', kind: 'export' as const },
];

export function BottomNav() {
  const recentId = useEstimateStore((s) => s.recentEstimateId);

  function resolve(kind: (typeof NAV)[number]['kind']): string {
    if (kind === 'results') return recentId ? `/estimates/${recentId}` : '/';
    if (kind === 'export') return recentId ? `/estimates/${recentId}/export` : '/';
    if (kind === 'compare') return '/compare';
    if (kind === 'templates') return '/templates';
    if (kind === 'catalog') return '/catalog';
    return '/';
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-2 py-3 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 shadow-bottom-nav rounded-t-lg">
      {NAV.map((item) => (
        <NavLink
          key={item.kind}
          to={resolve(item.kind)}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              isActive
                ? 'bg-primary-fixed/40 text-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} filled={isActive} />
              <span className="font-label-sm text-[11px] font-medium uppercase tracking-wider mt-1">
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
