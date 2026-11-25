import React, { useEffect, useState } from 'react';
import { WifiOff, Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaStatusBar: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissedInstall, setDismissedInstall] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  if (isOnline && (!installPrompt || dismissedInstall)) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 z-[9990] flex flex-col gap-2 max-w-xs">
      {!isOnline && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-amber-900 text-amber-50 shadow-xl border border-amber-700 flex items-center gap-2.5 text-xs font-semibold">
          <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
          <span>Modo Offline ativo — seus rascunhos e registros locais estão protegidos.</span>
        </div>
      )}

      {installPrompt && !dismissedInstall && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-700 text-white shadow-xl border border-emerald-500 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="w-4 h-4 shrink-0" />
            <span className="font-bold truncate">Instalar app no celular/PC</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-2.5 py-1 rounded-lg bg-white text-emerald-800 font-extrabold text-[11px] hover:bg-emerald-50 transition"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={() => setDismissedInstall(true)}
              className="p-1 rounded-lg hover:bg-emerald-600/70 transition"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
