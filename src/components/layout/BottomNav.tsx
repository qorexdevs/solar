import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useScenarioStore } from '@/store/scenarios';

const NAV = [
  { to: '/', icon: 'analytics', label: 'Scenarios', kind: 'list' as const },
  { to: '/results', icon: 'insights', label: 'Results', kind: 'results' as const },
  { to: '/compare', icon: 'compare_arrows', label: 'Compare', kind: 'compare' as const },
  { to: '/settings', icon: 'tune', label: 'Settings', kind: 'settings' as const },
  { to: '/export', icon: 'ios_share', label: 'Export', kind: 'export' as const },
];

export function BottomNav() {
  const recentId = useScenarioStore((s) => s.recentScenarioId);

  function resolve(kind: (typeof NAV)[number]['kind']): string {
    if (kind === 'results') return recentId ? `/scenarios/${recentId}` : '/';
    if (kind === 'export') return recentId ? `/scenarios/${recentId}/export` : '/';
    if (kind === 'compare') return '/compare';
    if (kind === 'settings') return '/settings';
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
