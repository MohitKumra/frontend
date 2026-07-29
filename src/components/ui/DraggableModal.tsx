import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * A modal that renders as a draggable bottom sheet on mobile (drag down to
 * dismiss, with rubber-band resistance and velocity-aware snapping) and as a
 * centered dialog on desktop. Uses framer-motion spring physics for a buttery
 * 60 fps app-like feel.
 *
 * On mobile the handle bar acts as the drag anchor so the content area
 * remains fully scrollable without interfering with the drag-to-dismiss
 * gesture.
 *
 * Performance notes:
 * - GPU-composited layers via will-change / translateZ(0)
 * - Spring-based motion (velocity-aware, maintains 60 fps)
 * - No timing-based animations in the drag lifecycle
 * - Minimal paint/layout triggers during animation
 */
export function DraggableModal({ isOpen, onClose, title, children }: DraggableModalProps) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const draggedFarEnough = info.offset.y > 120;
      const flickedDownFast = info.velocity.y > 500;
      if (draggedFarEnough || flickedDownFast) {
        onClose();
      }
    },
    [onClose],
  );

  /**
   * Allows the drag gesture to kick in even when the user starts touching
   * the handle bar on a touch device.  The handle has `touchAction: 'none'`
   * so the browser's compositor doesn't try to interpret scroll vs drag,
   * letting Framer Motion handle it entirely on the compositor thread.
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragControls.start(e);
  };

  if (typeof document === 'undefined') return null;

  /** Shared spring config for a snappy, over-damped, app-like feel */
  const springConfig = {
    type: 'spring' as const,
    stiffness: 420,
    damping: 36,
    mass: 0.86,
  };

  /** Even tighter spring for the backdrop */
  const backdropSpring = {
    type: 'spring' as const,
    stiffness: 520,
    damping: 42,
    mass: 0.7,
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50"
            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropSpring}
            onClick={onClose}
          />

          {isMobile ? (
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[101] rounded-t-3xl shadow-2xl flex flex-col"
              style={{
                background: 'var(--color-surface)',
                willChange: 'transform',
                transform: 'translateZ(0)',
                contain: 'layout style paint',
              }}
              initial={{ y: '100%', opacity: 0.96, scale: 0.985 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0.96, scale: 0.985 }}
              transition={springConfig}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.06, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle – touches here control the entire sheet drag */}
              <div
                className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                style={{ touchAction: 'none' }}
              >
                <div
                  className="w-10 h-1.5 rounded-full"
                  style={{ background: 'var(--color-border)' }}
                />
              </div>

              {title && (
                <div className="px-5 pt-2 pb-3 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-bold text-text-primary">{title}</h3>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted"
                    style={{ background: 'var(--color-surface-raised)' }}
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div
                ref={contentRef}
                className="px-5 pb-8 max-h-[75vh] overflow-y-auto overscroll-contain touch-pan-y"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={(e) => e.stopPropagation()}
              >
                {children}
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
              style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={backdropSpring}
              onClick={onClose}
            >
              <motion.div
                className="w-full max-w-md rounded-2xl shadow-2xl"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  maxHeight: '85vh',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
                initial={{ scale: 0.94, y: 16, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.98, y: 8, opacity: 0 }}
                transition={springConfig}
                onClick={(e) => e.stopPropagation()}
              >
                {title && (
                  <div
                    className="px-5 py-4 border-b flex items-center justify-between shrink-0"
                    style={{ borderColor: 'var(--color-border-subtle)' }}
                  >
                    <h3 className="text-sm font-bold text-text-primary">{title}</h3>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-text-muted hover:text-text-primary transition-colors"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
                <div className="p-5 overflow-y-auto min-h-0">{children}</div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
