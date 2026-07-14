import { useEffect } from 'react';

export interface TaskKeyboardShortcutOptions {
  onNewTask: () => void;
  onEditSelected: () => void;
  onCompleteSelected: () => void;
  onFocusSearch: () => void;
  onFocusMode: () => void;
  /** Returns true when a modal or input is focused — shortcuts should be suppressed */
  isBlocked?: () => boolean;
}

/**
 * Registers task-page keyboard shortcuts.
 *
 * | Key          | Action              |
 * |-------------|---------------------|
 * | Q            | New Task            |
 * | E            | Edit selected task  |
 * | Space        | Complete selected   |
 * | Ctrl+Enter   | Save (native form)  |
 * | /            | Focus search bar    |
 * | F            | Focus Mode          |
 */
export function useTaskKeyboardShortcuts({
  onNewTask,
  onEditSelected,
  onCompleteSelected,
  onFocusSearch,
  onFocusMode,
  isBlocked,
}: TaskKeyboardShortcutOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never fire when typing inside an input / textarea / select / contenteditable
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;

      // Custom isBlocked check (e.g. modal open)
      if (isBlocked?.()) return;

      switch (e.key) {
        case 'q':
        case 'Q':
          e.preventDefault();
          onNewTask();
          break;

        case 'e':
        case 'E':
          e.preventDefault();
          onEditSelected();
          break;

        case ' ':
          e.preventDefault();
          onCompleteSelected();
          break;

        case '/':
          e.preventDefault();
          onFocusSearch();
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          onFocusMode();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewTask, onEditSelected, onCompleteSelected, onFocusSearch, onFocusMode, isBlocked]);
}
