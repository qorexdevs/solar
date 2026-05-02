import type { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-on-background min-h-screen pt-16 pb-24 md:pb-8">
      <TopBar />
      <main className="max-w-container-max mx-auto px-md py-md">{children}</main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  );
}
