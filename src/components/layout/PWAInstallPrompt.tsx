import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'solarcalc-pwa-install-dismissed';

export function PWAInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === '1') return;
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    function onInstalled() {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, '1');
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible || !event) return null;

  return (
    <div className="fixed bottom-28 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md z-30 bg-primary text-on-primary rounded-xl shadow-elevated p-lg flex items-start gap-md">
      <Icon name="install_mobile" className="text-2xl mt-0.5" />
      <div className="flex-1">
        <p className="font-body-md font-semibold">Install SolarCalc</p>
        <p className="font-label-sm text-label-sm text-primary-fixed-dim mt-0.5">
          Add to your home screen for offline access to your scenarios.
        </p>
        <div className="flex gap-1 mt-1">
          <button
            type="button"
            className="px-1.5 py-0.5 rounded-lg bg-on-primary text-primary font-label-sm text-label-sm font-semibold"
            onClick={async () => {
              await event.prompt();
              const { outcome } = await event.userChoice;
              setVisible(false);
              if (outcome === 'dismissed') {
                localStorage.setItem(DISMISSED_KEY, '1');
              }
            }}
          >
            Install
          </button>
          <button
            type="button"
            className="px-1.5 py-0.5 rounded-lg border border-on-primary/40 text-on-primary font-label-sm text-label-sm"
            onClick={() => {
              setVisible(false);
              localStorage.setItem(DISMISSED_KEY, '1');
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
