import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Hook to get or create the modal root element for React portals.
 * This ensures modals render at the document body level, not inside scrollable containers.
 */
export function useModalRoot() {
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find existing modal root or create one
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    setModalRoot(root);
  }, []);

  return modalRoot;
}

/**
 * Component that renders children into a portal at the document body level.
 * Use this for modals, overlays, and other elements that should escape container constraints.
 */
interface ModalPortalProps {
  children: React.ReactNode;
}

export function ModalPortal({ children }: ModalPortalProps) {
  const modalRoot = useModalRoot();

  if (!modalRoot) return null;

  return createPortal(children, modalRoot);
}
