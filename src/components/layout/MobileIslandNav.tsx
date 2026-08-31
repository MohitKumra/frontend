import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutGrid, CheckSquare, CalendarDays, Flame,
  Plus, ChevronDown
} from "lucide-react";

interface MobileIslandNavProps {
  onOpenMore: () => void;
}

export function MobileIslandNav({ onOpenMore }: MobileIslandNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 390));
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Collapse on outside click when expanded
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isExpanded]);

  // Collapse on ESC
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  // Auto-collapse when user scrolls the page
  useEffect(() => {
    if (!isExpanded) return;
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      if (Math.abs(window.scrollY - lastScrollY) > 20) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isExpanded]);

  // Dimensions
  const targetWidth = Math.min(vw - 24, 360);
  const collapsedWidth = 124;
  const collapsedHeight = 16;
  const expandedHeight = 64;

  const springConfig = {
    type: "spring" as const,
    stiffness: 440,
    damping: 34,
    mass: 0.65,
    restDelta: 0.001,
  };

  const isRouteActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="md:hidden pointer-events-none">
      <div
        ref={containerRef}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[85] flex flex-col items-center select-none pointer-events-auto"
        style={{
          touchAction: "manipulation",
        }}
      >
        <motion.div
          animate={{
            width: isExpanded ? targetWidth : collapsedWidth,
            height: isExpanded ? expandedHeight : collapsedHeight,
            borderRadius: isExpanded ? 32 : 100,
          }}
          transition={springConfig}
          style={{
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            willChange: "transform, width, height, border-radius",
            transform: "translate3d(0,0,0)",
            overflow: "hidden",
          }}
          className={[
            "relative flex items-center justify-center cursor-pointer border transition-colors duration-200",
            isExpanded
              ? "bg-white/90 dark:bg-[#111827]/90 border-slate-200/80 dark:border-slate-800 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_48px_-6px_rgba(0,0,0,0.55)]"
              : "bg-white/80 dark:bg-[#111827]/80 border-slate-200/70 dark:border-slate-800 shadow-[0_6px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.35)]",
          ].join(" ")}
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
          }}
        >
          {/* ─── SLEEK COLLAPSED LINE / CAPSULE ─── */}
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <motion.div
                key="collapsed-line"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="w-full h-full flex items-center justify-center gap-1.5 py-1 px-4"
              >
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shadow-xs" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              </motion.div>
            ) : (
              /* ─── EXPANDED NAVIGATION ISLAND ─── */
              <motion.div
                key="expanded-island"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16, delay: 0.03, ease: "easeOut" }}
                className="w-full h-full flex items-center justify-between px-3.5 relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left Item 1: Dashboard */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 600, damping: 25 }}
                  onClick={() => {
                    navigate("/");
                  }}
                  className="flex flex-col items-center justify-center w-11 h-11 rounded-2xl relative"
                  aria-label="Dashboard"
                >
                  <LayoutGrid
                    size={22}
                    strokeWidth={isRouteActive("/", true) ? 2.6 : 1.9}
                    className={
                      isRouteActive("/", true)
                        ? "text-accent"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    }
                  />
                  {isRouteActive("/", true) && (
                    <motion.div
                      layoutId="activeDot"
                      className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
                    />
                  )}
                </motion.button>

                {/* Left Item 2: Tasks */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 600, damping: 25 }}
                  onClick={() => {
                    navigate("/tasks");
                  }}
                  className="flex flex-col items-center justify-center w-11 h-11 rounded-2xl relative"
                  aria-label="Tasks"
                >
                  <CheckSquare
                    size={22}
                    strokeWidth={isRouteActive("/tasks", false) ? 2.6 : 1.9}
                    className={
                      isRouteActive("/tasks", false)
                        ? "text-accent"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    }
                  />
                  {isRouteActive("/tasks", false) && (
                    <motion.div
                      layoutId="activeDot"
                      className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
                    />
                  )}
                </motion.button>

                {/* Center Plus Button — Opens DraggableModal */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 600, damping: 22 }}
                  onClick={() => {
                    onOpenMore();
                  }}
                  className="relative flex items-center justify-center rounded-full text-white shadow-lg mx-1"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)",
                    boxShadow: "0 8px 22px -2px rgba(108, 99, 255, 0.48), 0 2px 6px rgba(0, 0, 0, 0.08)",
                  }}
                  aria-label="Create or view quick actions"
                >
                  <Plus size={24} strokeWidth={2.8} />
                </motion.button>

                {/* Right Item 1: Calendar */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 600, damping: 25 }}
                  onClick={() => {
                    navigate("/calendar");
                  }}
                  className="flex flex-col items-center justify-center w-11 h-11 rounded-2xl relative"
                  aria-label="Calendar"
                >
                  <CalendarDays
                    size={22}
                    strokeWidth={isRouteActive("/calendar", false) ? 2.6 : 1.9}
                    className={
                      isRouteActive("/calendar", false)
                        ? "text-accent"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    }
                  />
                  {isRouteActive("/calendar", false) && (
                    <motion.div
                      layoutId="activeDot"
                      className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
                    />
                  )}
                </motion.button>

                {/* Right Item 2: Habits */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 600, damping: 25 }}
                  onClick={() => {
                    navigate("/habits");
                  }}
                  className="flex flex-col items-center justify-center w-11 h-11 rounded-2xl relative"
                  aria-label="Habits"
                >
                  <Flame
                    size={22}
                    strokeWidth={isRouteActive("/habits", false) ? 2.6 : 1.9}
                    className={
                      isRouteActive("/habits", false)
                        ? "text-accent"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    }
                  />
                  {isRouteActive("/habits", false) && (
                    <motion.div
                      layoutId="activeDot"
                      className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
                    />
                  )}
                </motion.button>

                {/* Collapse mini button */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="absolute -top-2 right-2.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center transition-colors shadow-xs"
                  aria-label="Collapse nav"
                >
                  <ChevronDown size={11} strokeWidth={2.5} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>,
    document.body
  );
}
