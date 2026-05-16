import React, { useState, useEffect } from 'react';
import { X, Download, Share, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if the app is already installed or running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      return; // Do not show if already installed
    }

    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // If it's iOS, we can show the install instruction popup after a slight delay
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowInstall(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const handleAppInstalled = () => {
      setShowInstall(false);
      setDeferredPrompt(null);
    };

    const handleManualTrigger = () => {
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('manual-install-pwa', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('manual-install-pwa', handleManualTrigger);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // If no prompt, it's likely they need to use the browser's install feature (or it's not supported)
      alert('Để cài đặt, hãy tìm tuỳ chọn "Thêm vào màn hình chính" (Add to Home Screen) trong menu trình duyệt của bạn.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  return (
    <AnimatePresence>
      {showInstall && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[100] bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 flex flex-col gap-3"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
              <img src="https://raw.githubusercontent.com/trongtt-landtrack/Anh-Logo/main/xql6xl4b.png" alt="LandTrack" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-primary font-display text-sm">Cài đặt LandTrack</h4>
              <p className="text-xs text-gray-500 font-sans">Thêm vào màn hình chính để truy cập nhanh hơn</p>
            </div>
            <button onClick={() => setShowInstall(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1 rounded-full transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {isIOS ? (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
              <p className="flex items-center gap-2 mb-2">
                1. Nhấn vào biểu tượng <Share className="w-4 h-4 text-blue-500" /> ở thanh menu dưới cùng.
              </p>
              <p className="flex items-center gap-2">
                2. Chọn <strong>Thêm vào MH chính</strong> <PlusSquare className="w-4 h-4 text-gray-400" />
              </p>
            </div>
          ) : (
            <button onClick={handleInstall} className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Cài đặt ứng dụng
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
