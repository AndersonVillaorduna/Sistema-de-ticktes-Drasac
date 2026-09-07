import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal renderizado vía portal en <body>. Es necesario porque las páginas
 * usan animate-fade-in (transform), y un ancestro con transform convierte
 * el position:fixed de los descendientes en relativo a ese contenedor,
 * lo que descentra el modal en páginas largas.
 */
const Modal = ({ children, onClose, maxW = 'max-w-md' }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxW} rounded-2xl border border-white/8 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto`}
        style={{ background: 'var(--bg-secondary)' }}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10">
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
