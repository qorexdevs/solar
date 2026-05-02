// Triggers vite-plugin-pwa to inject the service worker registration in builds.
// In dev this is a no-op when devOptions.enabled is false (default).
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}
