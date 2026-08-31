import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";
import { X } from "lucide-react";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Premium SaaS bottom sheet on mobile — GPU-composited 120fps spring physics, full-surface
 * responsive drag-to-dismiss, dynamic reactive backdrop, and elastic rubber-banding.
 */
export function DraggableModal({ isOpen, onClose, title, children }: DraggableModalProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const contentRef = useRef<HTMLDivElement>(null);
  const dragY = useMotionValue(0);

  // Dynamic reactive backdrop opacity tied 1:1 to drag displacement
  const backdropOpacity = useTransform(dragY, [0, 220], [1, 0.15]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // Highly responsive dismiss threshold (60px drag distance or 240px/s velocity)
      if (info.offset.y > 60 || info.velocity.y > 240) {
        onClose();
      }
    },
    [onClose]
  );

  if (typeof document === "undefined") return null;

  // Ultra-fluid 120fps spring physics for snappy, organic bounce
  const sheetSpring = {
    type: "spring" as const,
    damping: 32,
    stiffness: 460,
    mass: 0.55,
    restDelta: 0.001,
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Dynamic Reactive Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100]"
            style={{
              background: "rgba(0, 0, 0, 0.52)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              opacity: isMobile ? backdropOpacity : 1,
              willChange: "opacity",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" as const }}
            onClick={onClose}
          />

          {isMobile ? (
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col overflow-hidden"
              style={{
                y: dragY,
                background: "var(--color-surface)",
                borderRadius: "32px 32px 0 0",
                boxShadow:
                  "0 -24px 60px -10px rgba(0, 0, 0, 0.4), 0 -1px 0 rgba(255, 255, 255, 0.12) inset",
                willChange: "transform",
                transform: "translate3d(0,0,0)",
                contain: "layout style paint",
                maxHeight: "86vh",
                touchAction: "pan-y",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={sheetSpring}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.03, bottom: 0.7 }}
              onDragEnd={handleDragEnd}
            >
              {/* Grab Handle */}
              <div className="flex justify-center items-center pt-3.5 pb-1 shrink-0 select-none cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 rounded-full bg-slate-400/50 dark:bg-white/25 transition-transform active:scale-95" />
              </div>

              {title && (
                <div className="flex items-center justify-between px-6 pt-1 pb-3 shrink-0 border-b border-border/40 select-none">
                  <div>
                    <h3 className="text-[17px] font-bold text-text-primary tracking-tight">
                      {title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100/80 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-text-muted hover:text-text-primary transition-all active:scale-90"
                    aria-label="Close"
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              <div
                ref={contentRef}
                className="overflow-y-auto overscroll-contain touch-pan-y"
                style={{
                  maxHeight: "76vh",
                  WebkitOverflowScrolling: "touch",
                  padding: "16px 20px 36px 20px",
                }}
                onPointerDown={(e) => {
                  if (contentRef.current && contentRef.current.scrollTop > 0) {
                    e.stopPropagation();
                  }
                }}
              >
                {children}
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
              style={{ willChange: "opacity" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" as const }}
              onClick={onClose}
            >
              <motion.div
                className="w-full max-w-md rounded-3xl overflow-hidden border border-border/80 shadow-2xl"
                style={{
                  background: "var(--color-surface)",
                  boxShadow: "0 28px 64px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--color-border)",
                  willChange: "transform, opacity",
                  transform: "translate3d(0,0,0)",
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                }}
                initial={{ scale: 0.94, y: 16, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.96, y: 8, opacity: 0 }}
                transition={sheetSpring}
                onClick={(e) => e.stopPropagation()}
              >
                {title && (
                  <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border/50">
                    <h3 className="text-base font-bold text-text-primary tracking-tight">{title}</h3>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/10 text-text-muted hover:text-text-primary transition-all active:scale-90"
                      aria-label="Close"
                    >
                      <X size={15} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
                <div className="p-6 overflow-y-auto min-h-0">{children}</div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

