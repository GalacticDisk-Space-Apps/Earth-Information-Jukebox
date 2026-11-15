import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '@/store/useJukebox';

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
  const reducedMotion = useReducedMotion();

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

  const easeCurve: [number, number, number, number] = [0.22, 1, 0.36, 1];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-dialog-title"
            aria-describedby="help-dialog-description"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: easeCurve }}
            className="relative w-full max-w-xl rounded-2xl border border-white/[0.12] bg-black/90 backdrop-blur-2xl p-6 text-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
              <div>
                <h2 id="help-dialog-title" className="font-display font-medium text-base text-white tracking-tight">
                  Keyboard Navigation &amp; Shortcuts
                </h2>
                <p id="help-dialog-description" className="font-sans text-xs text-white/50 mt-1">
                  Global keyboard controls for screen-reader and hands-on scientific exploration.
                </p>
              </div>
              <motion.button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
                whileTap={reducedMotion ? {} : { scale: 0.98 }}
                aria-label="Close keyboard shortcuts dialog"
                className="px-3 py-1 text-xs font-mono rounded-xl border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors"
              >
                Close (Esc)
              </motion.button>
            </div>

            {/* Shortcuts Table */}
            <div className="overflow-y-auto max-h-[55vh] pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-white/40 font-mono">
                    <th className="py-2.5 pr-4 uppercase tracking-[0.12em] font-medium">Key</th>
                    <th className="py-2.5 uppercase tracking-[0.12em] font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {SHORTCUTS.map((item) => (
                    <tr key={item.key} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        <kbd className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-white/[0.08] border border-white/[0.12] text-white shadow-inner">
                          {item.key}
                        </kbd>
                      </td>
                      <td className="py-2.5 text-white/80 font-sans">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-white/[0.08] flex justify-between items-center text-xs text-white/50">
              <span className="font-mono text-[11px]">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.12] text-white font-mono">?</kbd> anytime to toggle this modal.
              </span>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
                whileTap={reducedMotion ? {} : { scale: 0.98 }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white transition-all accent-gradient-bg hover:brightness-110 shadow-sm"
              >
                Dismiss
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HelpDialog;
