import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { isSettingsNavActive } from '@/components/layout/navActive';

const NAV = [
  { to: '/', icon: 'analytics', label: 'Estimates' },
  { to: '/compare', icon: 'compare_arrows', label: 'Compare' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
] as const;

export function TopBar() {
  const { pathname } = useLocation();

  return (
    <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-base h-16 bg-surface-container-lowest border-b border-outline-variant shadow-top-nav">
      <Link to="/" className="flex items-center gap-1">
        <Icon name="solar_power" className="text-primary text-2xl" />
        <span className="font-headline-lg text-headline-lg tracking-tighter text-primary">
          SolarCalc
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <nav className="hidden md:flex gap-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => {
                const active =
                  item.to === '/settings' ? isSettingsNavActive(pathname) : isActive;
                return `font-label-sm text-label-sm transition-colors flex flex-col items-center gap-0.5 active:opacity-80 ${
                  active ? 'text-primary' : 'text-on-surface hover:text-primary'
                }`;
              }}
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
