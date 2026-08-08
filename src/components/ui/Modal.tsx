import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo, useDragControls } from 'framer-motion';
import { useModalRoot } from './ModalRoot';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const modalRoot = useModalRoot();

  // Keep the latest onClose in a ref so the effect below doesn't need it
  // as a dependency. onClose is passed as an inline arrow function from
  // parents (e.g. `onClose={() => setShowCreate(false)}`), which is a new
  // reference every render. If it were a dependency, this effect would
  // tear down and re-run on every keystroke inside the modal (since typing
  // re-renders the parent), re-focusing the first focusable element and
  // stealing focus away from whatever input the user is typing in.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle initial focus, focus trapping, and body scroll lock.
  // Deps: [open] ONLY — this must run exactly once per open/close
  // transition, never on incidental re-renders while the modal is open.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // On mobile the sheet slides up from the bottom; auto-focusing an input
    // immediately triggers the virtual keyboard before the animation finishes,
    // which causes a jarring layout jump. Skip auto-focus on mobile.
    if (!isMobile) {
      // Focus the first focusable element INSIDE THE CONTENT AREA, not the
      // header. The header's close (X) button sits before the content in
      // DOM order, so querying the whole dialog would focus the X button
      // first instead of e.g. the form's first input.
      const focusableInContent = contentRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableInContent?.[0] ?? null;
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        dialogRef.current?.focus();
      }
    }

    // Focus trap cycles across the WHOLE dialog (header + content), so Tab
    // still reaches the close button — just don't auto-focus it on open.
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const all = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!all?.length) return;
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = '';
      previouslyFocusedElement.current?.focus();
    };
  }, [open, isMobile]);

  const handleDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onCloseRef.current();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragControls.start(e);
  };

  if (!modalRoot) return null;

  const sheetSpring = {
    type: 'spring' as const,
    stiffness: 420,
    damping: 36,
    mass: 0.86,
  };

  const sheetBounce = {
    top: 0.06,
    bottom: 0.5,
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'var(--overlay-bg, rgba(0,0,0,0.5))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
            aria-hidden="true"
          />

          {isMobile ? (
            /* ── Mobile: draggable bottom sheet ── */
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              tabIndex={-1}
              className="fixed bottom-0 left-0 right-0 z-[51] rounded-t-3xl overflow-hidden shadow-2xl flex flex-col"
              style={{
                background: 'var(--modal-bg)',
                borderTop: '1px solid var(--modal-border)',
                willChange: 'transform',
                transform: 'translateZ(0)',
                contain: 'layout style paint',
                maxHeight: '90dvh',
              }}
              initial={{ y: '100%', opacity: 0.96, scale: 0.985 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0.96, scale: 0.985 }}
              transition={sheetSpring}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={sheetBounce}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              <div
                className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0"
                onPointerDown={handlePointerDown}
                style={{ touchAction: 'none' }}
              >
                <div
                  className="w-10 h-1.5 rounded-full"
                  style={{ background: 'var(--color-border-strong, var(--color-border))' }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
                {title ? (
                  <h2 id="modal-title" className="text-base font-bold text-text-primary">
                    {title}
                  </h2>
                ) : (
                  <div />
                )}
                <button
                  onClick={onClose}
                  className="tap-target w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary transition-colors"
                  style={{ background: 'var(--color-surface-raised)' }}
                  aria-label="Close modal"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Content */}
              <div
                ref={contentRef}
                className="overflow-y-auto overscroll-contain touch-pan-y px-5 pb-8 flex-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {children}
              </div>
            </motion.div>
          ) : (
            /* ── Desktop: centered dialog ── */
            <motion.div
              className="fixed inset-0 z-[51] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            >
              <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                tabIndex={-1}
                className={['w-full shadow-2xl flex flex-col max-h-[90dvh] border rounded-2xl', maxWidth].join(' ')}
                style={{
                  background: 'var(--modal-bg)',
                  borderColor: 'var(--modal-border)',
                  boxShadow: 'var(--modal-shadow)',
                }}
                initial={{ scale: 0.94, y: 16, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.98, y: 8, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
                  {title ? (
                    <h2 id="modal-title" className="text-lg font-bold text-text-primary">
                      {title}
                    </h2>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={onClose}
                    className="tap-target w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div ref={contentRef} className="overflow-y-auto px-6 pb-6 pt-1 flex-1">
                  {children}
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>,
    modalRoot
  );
}
