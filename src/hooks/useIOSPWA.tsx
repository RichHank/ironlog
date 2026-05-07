import { useEffect, useState, useCallback } from 'react';

// Detect if user is on iOS Safari (not in standalone/PWA mode)
export function detectIOSPWA(): {
  isIOS: boolean;
  isStandalone: boolean;
  needsInstallPrompt: boolean;
} {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone = 'standalone' in nav && nav.standalone === true;
  return {
    isIOS,
    isStandalone,
    needsInstallPrompt: isIOS && !isStandalone,
  };
}

export function useIOSPWA() {
  const [state, setState] = useState(() => detectIOSPWA());
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const { needsInstallPrompt } = detectIOSPWA();
    // Show prompt after a short delay if not dismissed
    if (needsInstallPrompt && !dismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setShowPrompt(false);
  }, []);

  return {
    ...state,
    showPrompt,
    dismiss,
    dismissPermanently: () => {
      setDismissed(true);
      setShowPrompt(false);
      try { localStorage.setItem('il-ios-prompt-dismissed', 'true'); } catch {}
    },
  };
}

// ── iOS Install Prompt Bottom Sheet ──
export function InstallPrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade-in" onClick={onDismiss}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-zinc-900 px-6 pb-10 pt-6 animate-slide-up border-t border-zinc-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📲</span>
            <div>
              <h3 className="text-lg font-bold text-zinc-50">Install IronLog</h3>
              <p className="text-sm text-zinc-400">Get the best workout tracking experience</p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">1</span>
            <p className="text-sm text-zinc-300">Tap the <strong className="text-white">Share</strong> button in Safari</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">2</span>
            <p className="text-sm text-zinc-300">Scroll down and tap <strong className="text-white">Add to Home Screen</strong></p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">3</span>
            <p className="text-sm text-zinc-300">Open IronLog from your home screen for the full app experience</p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full rounded-xl bg-blue-500 py-3 text-base font-bold text-white active:scale-95 transition-transform"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
