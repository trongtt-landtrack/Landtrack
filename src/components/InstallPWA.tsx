import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-4 animate-in slide-in-from-bottom-10">
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
        <Download className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-primary">Cài đặt LandTrack</h4>
        <p className="text-xs text-gray-500">Thêm vào màn hình chính để truy cập nhanh hơn</p>
      </div>
      <button onClick={handleInstall} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase">
        Cài đặt
      </button>
      <button onClick={() => setShowInstall(false)} className="text-gray-400">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
