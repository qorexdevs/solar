import { Link, NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useScenarioStore } from '@/store/scenarios';

const NAV = [
  { to: '/', icon: 'analytics', label: 'Scenarios' },
  { to: '/results', icon: 'insights', label: 'Results' },
  { to: '/compare', icon: 'compare_arrows', label: 'Compare' },
  { to: '/settings', icon: 'tune', label: 'Settings' },
  { to: '/export', icon: 'ios_share', label: 'Export' },
];

export function TopBar() {
  const recentId = useScenarioStore((s) => s.recentScenarioId);

  function resolve(to: string): string {
    if (to === '/results') return recentId ? `/scenarios/${recentId}` : '/';
    if (to === '/export') return recentId ? `/scenarios/${recentId}/export` : '/';
    return to;
  }

  return (
    <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-4 h-16 bg-surface-container-lowest border-b border-outline-variant shadow-top-nav">
      <Link to="/" className="flex items-center gap-2">
        <Icon name="solar_power" className="text-primary text-2xl" />
        <span className="font-headline-lg text-headline-lg tracking-tighter text-primary">
          SolarCalc
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <nav className="hidden md:flex gap-6">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={resolve(item.to)}
              end={item.to === '/'}
              className={({ isActive }) =>
                `font-label-sm text-label-sm transition-colors flex flex-col items-center gap-1 active:opacity-80 ${
                  isActive ? 'text-primary' : 'text-on-surface hover:text-primary'
                }`
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="h-8 w-8 rounded-full bg-surface-variant flex items-center justify-center text-primary overflow-hidden">
          <Icon name="person" className="text-sm" />
        </div>
      </div>
    </header>
  );
}
