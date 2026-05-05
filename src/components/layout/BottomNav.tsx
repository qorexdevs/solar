import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { isSettingsNavActive } from '@/components/layout/navActive';

const NAV = [
  { to: '/', icon: 'analytics', label: 'Estimates' },
  { to: '/compare', icon: 'compare_arrows', label: 'Compare' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-1 py-1.5 bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 shadow-bottom-nav rounded-t-lg">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => {
            const active =
              item.to === '/settings' ? isSettingsNavActive(pathname) : isActive;
            return `flex flex-col items-center justify-center px-1.5 py-0.5 rounded-xl transition-all active:scale-95 ${
              active
                ? 'bg-primary-fixed/40 text-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`;
          }}
        >
          {({ isActive }) => {
            const active =
              item.to === '/settings' ? isSettingsNavActive(pathname) : isActive;
            return (
              <>
                <Icon name={item.icon} filled={active} />
                <span className="font-label-sm text-[11px] font-medium uppercase tracking-wider mt-0.5">
                  {item.label}
                </span>
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}
