import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode };

/**
 * Modal form panel: bottom sheet on phones, centred dialog on wider screens.
 * Escape and the backdrop close it; focus moves into the panel and returns afterwards.
 */
const Sheet = ({ open, title, onClose, children }: Props) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && panel) {
        // Keep keyboard focus inside the dialog
        const nodes = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!nodes.length) return;
        const firstNode = nodes[0], lastNode = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === firstNode) { e.preventDefault(); lastNode.focus(); }
        else if (!e.shiftKey && document.activeElement === lastNode) { e.preventDefault(); firstNode.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-gray-200 rounded-t-xl sm:rounded-xl p-5 space-y-4"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-between items-center gap-3">
          <h2 id="sheet-title" className="text-base font-semibold text-gray-900">{title}</h2>
          <button data-close onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Sheet;
