import { notesStore } from '../stores/notesStore';
import { createLogger } from '../../utils/logger';

const logger = createLogger('keyboardShortcuts');

export interface ShortcutHandler {
  key: string;
  modifiers: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
  };
  handler: (event: KeyboardEvent) => void;
  description: string;
}

/**
 * Check if keyboard event modifiers match the required modifiers for a shortcut.
 * Handles platform-specific differences (e.g., Cmd on macOS vs Ctrl on Windows/Linux).
 *
 * Uses a simple binary check: required modifier must match event modifier state.
 * For example, if shift is required, event.shiftKey must be true, and vice versa.
 */
function areModifiersMatching(
  requiredModifiers: ShortcutHandler['modifiers'],
  event: KeyboardEvent,
  isMac: boolean
): boolean {
  const shiftMatches = Boolean(requiredModifiers.shift) === event.shiftKey;
  const altMatches = Boolean(requiredModifiers.alt) === event.altKey;

  // Platform-specific: Ctrl on macOS means Cmd (Meta), Ctrl elsewhere means Ctrl key
  const ctrlRequired = Boolean(requiredModifiers.ctrl);
  const ctrlMatches = isMac
    ? ctrlRequired === event.metaKey
    : ctrlRequired === event.ctrlKey;

  // Meta modifier: only applies on macOS; on other platforms it should never match
  const metaRequired = Boolean(requiredModifiers.meta);
  const metaMatches = isMac ? metaRequired === event.metaKey : !event.metaKey;

  return shiftMatches && altMatches && ctrlMatches && metaMatches;
}

export function createShortcutHandler(shortcuts: ShortcutHandler[]) {
  const isMac = process.platform === 'darwin';

  return (event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const isKeyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const isModifiersMatch = areModifiersMatching(
        shortcut.modifiers,
        event,
        isMac
      );

      if (isKeyMatch && isModifiersMatch) {
        event.preventDefault();
        shortcut.handler(event);
        break;
      }
    }
  };
}

export function setupKeyboardShortcuts(): () => void {
  const store = notesStore.getState();

  const shortcuts: ShortcutHandler[] = [
    {
      key: 'n',
      modifiers: { ctrl: true },
      description: 'Create new note',
      handler: async () => {
        const title = `Note ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
        await store.createNote(title, '');
      },
    },
    {
      key: 's',
      modifiers: { ctrl: true },
      description: 'Save note (auto-save is enabled)',
      handler: () => {
        // Note: Auto-save is already handled by the editor
        // This shortcut is just to prevent default browser behavior
        logger.info('Note is auto-saved');
      },
    },
    {
      key: 'k',
      modifiers: { ctrl: true },
      description: 'Focus search',
      handler: () => {
        const searchInput = document.querySelector(
          '.search-input'
        ) as HTMLInputElement;
        searchInput?.focus();
      },
    },
    {
      key: 'b',
      modifiers: { ctrl: true, shift: true },
      description: 'Toggle sidebar',
      handler: () => {
        store.toggleSidebar();
      },
    },
  ];

  const handleKeydown = createShortcutHandler(shortcuts);
  window.addEventListener('keydown', handleKeydown);

  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeydown);
  };
}
