import React from 'react';
import { Download, Smartphone, Laptop, CheckCircle2, Share, PlusSquare, X } from 'lucide-react';
import { usePwa } from '../../context/PwaContext.jsx';

const PwaInstallModal = () => {
  const { isInstallModalOpen, setIsInstallModalOpen, isIOS, isInstalled, promptInstall } = usePwa();

  if (!isInstallModalOpen || isInstalled) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Install SODMAS App
              </h3>
              <p className="text-[11px] text-slate-400">Progressive Web Application (PWA)</p>
            </div>
          </div>
          <button
            onClick={() => setIsInstallModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          
          <div className="flex items-center gap-3.5 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl">
            <img src="/logo.png" alt="SODMAS Logo" className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-blue-200 dark:border-slate-700 shadow-2xs shrink-0" />
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">SODMAS Platform</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Clinical practice & hospital management</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2 py-1">
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Instant Access:</strong> Launch directly from your desktop taskbar or phone home screen.</span>
            </div>
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Standalone Window:</strong> Clean interface without URL address bars or browser clutter.</span>
            </div>
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Faster Performance:</strong> Cached app shell for near-instant page transitions.</span>
            </div>
          </div>

          {/* iOS Specific Instructions */}
          {isIOS ? (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
              <span className="font-bold text-slate-900 dark:text-white block">To install on iPhone or iPad:</span>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-1.5">
                  1. Tap the <Share className="w-3.5 h-3.5 text-blue-500 inline" /> <strong>Share</strong> button at bottom of Safari.
                </li>
                <li className="flex items-center gap-1.5">
                  2. Scroll down and tap <PlusSquare className="w-3.5 h-3.5 text-blue-500 inline" /> <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  3. Tap <strong>Add</strong> in the top-right corner.
                </li>
              </ol>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-[11px] text-slate-500 dark:text-slate-400">
              💡 Supports Chrome, Edge, Brave, and Android. You can also install by clicking the install icon in your browser address bar.
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={() => setIsInstallModalOpen(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            {isIOS ? 'Got it' : 'Cancel'}
          </button>

          {!isIOS && (
            <button
              type="button"
              onClick={() => {
                promptInstall();
              }}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install Application</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default PwaInstallModal;
