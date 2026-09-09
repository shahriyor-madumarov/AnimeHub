import React from 'react';
import { CheckCircle, Info, X } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useWatchlist();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start justify-between gap-3 p-3.5 bg-[#141724]/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-md animate-fadeIn"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white">{toast.title}</p>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
