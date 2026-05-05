/** True when the Settings nav item should show as active (hub + nested admin routes). */
export function isSettingsNavActive(pathname: string): boolean {
  return pathname === '/settings' || pathname === '/catalog' || pathname.startsWith('/templates');
}
