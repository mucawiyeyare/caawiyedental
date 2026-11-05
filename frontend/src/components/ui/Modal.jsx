import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, subtitle, icon: Icon, children, maxWidth = 'max-w-2xl' }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-xs">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      <div className={`relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden border border-slate-100 z-10 my-auto animate-in fade-in zoom-in-95 duration-150`}>
        
        {/* Top-right close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer z-20 flex items-center justify-center active:scale-90"
          title="Close"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-h-[88vh] sm:max-h-[calc(90vh-40px)] overflow-y-auto momentum-scroll">
          {/* Centered Header Badge if title exists */}
          {title && (
            <div className="text-center mb-4 sm:mb-5 px-6 sm:px-0">
              {Icon && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 border border-blue-100/80 shadow-2xs">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              )}
              <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">{title}</h3>
              {subtitle && (
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
