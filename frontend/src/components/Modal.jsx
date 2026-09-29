import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

let openModals = 0;
let previousInert = false;
let previousOverflow = '';

const Modal = ({ children, onClose, maxW = 'max-w-md' }) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement;
    const root = document.getElementById('root');
    if (openModals++ === 0) {
      previousInert = root?.inert || false;
      previousOverflow = document.body.style.overflow;
      if (root) root.inert = true;
      document.body.style.overflow = 'hidden';
    }
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    ) || []).filter((element) => element.getClientRects().length);
    (focusable()[0] || dialogRef.current)?.focus();
    const onKey = (event) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== dialogRef.current) return;
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === items[0] || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault();
        items[0].focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (--openModals === 0) {
        if (root) root.inert = previousInert;
        document.body.style.overflow = previousOverflow;
      }
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Ventana de diálogo" tabIndex={-1}
        className={`relative w-full ${maxW} rounded-2xl border border-white/8 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto`}
        style={{ background: 'var(--bg-secondary)' }}>
        <button onClick={onClose} aria-label="Cerrar ventana"
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
