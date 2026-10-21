import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icon.jsx';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input:not([disabled]),select,[tabindex]:not([tabindex="-1"])';
const FIELDS = 'input:not([disabled]),select,textarea';

// Accessible dialog: labelled, Escape closes, focus is trapped and restored.
export function Modal({ open, title, onClose, children, wide = false }) {
  const ref = useRef(null);
  const titleId = useId();

  // Keep the latest onClose in a ref. Callers usually pass a new inline function on every
  // render; if the effect depended on it, focus would be reset (jumping to the close
  // button) each time the user typed a character.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const node = ref.current;
    // Focus the first form field if there is one, otherwise the first focusable element.
    (node?.querySelector(FIELDS) ?? node?.querySelector(FOCUSABLE))?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; previous?.focus?.(); };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none shadow-pop sm:rounded-b-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          <button type="button" className="btn-ghost -mr-2 p-1.5" onClick={onClose} aria-label="Close dialog"><Icon name="close" className="h-5 w-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
