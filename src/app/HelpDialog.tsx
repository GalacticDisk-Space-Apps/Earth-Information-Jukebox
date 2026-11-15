import React, { useEffect, useRef } from 'react';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { key: 'Space', description: 'Toggle playback sweep (Play / Pause)' },
  { key: 'ArrowLeft / ArrowRight', description: 'Move inspection cursor 2 degrees longitude' },
  { key: 'Shift + ArrowLeft / Right', description: 'Move inspection cursor 10 degrees longitude' },
  { key: 'ArrowUp / ArrowDown', description: 'Step frame year forward / backward (2004–2024)' },
  { key: '1 - 4', description: 'Directly switch active dataset track' },
  { key: 'M', description: 'Toggle master audio mute' },
  { key: 'Enter', description: 'Inspect selected point (plays sound & shows data)' },
  { key: 'L', description: 'Toggle data layer overlay' },
  { key: 'Escape', description: 'Clear inspection selection / Close dialog' },
  { key: '?', description: 'Toggle this keyboard shortcuts dialog' },
];

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;

      // Focus close button on mount
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus();
      });

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
          const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(7, 11, 20, 0.85)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
        aria-describedby="help-dialog-description"
        className="relative w-full max-w-xl rounded-lg border p-6 text-slate-100 shadow-2xl"
        style={{
          backgroundColor: '#0F1626',
          borderColor: '#1E2A40',
        }}
      >
        <div className="flex items-center justify-between border-b pb-4 mb-4" style={{ borderColor: '#1E2A40' }}>
          <div>
            <h2 id="help-dialog-title" className="text-base font-bold text-white tracking-tight">
              Keyboard Navigation & Shortcuts
            </h2>
            <p id="help-dialog-description" className="text-xs text-slate-400 mt-1">
              Global keyboard controls for screen-reader and hands-on scientific exploration.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts dialog"
            className="px-2.5 py-1 text-xs font-semibold rounded border text-slate-300 hover:text-white transition-colors"
            style={{
              backgroundColor: '#070B14',
              borderColor: '#1E2A40',
            }}
          >
            Close (Esc)
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh] pr-1">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-slate-400 font-mono" style={{ borderColor: '#1E2A40' }}>
                <th className="py-2 pr-4 font-medium">Key</th>
                <th className="py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#1E2A40' }}>
              {SHORTCUTS.map((item) => (
                <tr key={item.key} className="hover:bg-slate-900/50">
                  <td className="py-2.5 pr-4 font-mono font-semibold text-slate-200 whitespace-nowrap">
                    <kbd
                      className="px-2 py-1 rounded text-xs border"
                      style={{
                        backgroundColor: '#070B14',
                        borderColor: '#1E2A40',
                      }}
                    >
                      {item.key}
                    </kbd>
                  </td>
                  <td className="py-2.5 text-slate-300">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-between items-center text-xs text-slate-400" style={{ borderColor: '#1E2A40' }}>
          <span>Press <kbd className="px-1.5 py-0.5 rounded border font-mono" style={{ backgroundColor: '#070B14', borderColor: '#1E2A40' }}>?</kbd> anytime to toggle this modal.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: '#1E5BD8' }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpDialog;
