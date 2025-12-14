import { notesStore } from '../stores/notesStore';

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

export function createShortcutHandler(shortcuts: ShortcutHandler[]) {
  return (event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const isShiftMatch = shortcut.modifiers.shift ? event.shiftKey : !event.shiftKey;
      const isAltMatch = shortcut.modifiers.alt ? event.altKey : !event.altKey;
      const isKeyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      // Check if either Ctrl (Windows/Linux) or Meta (Mac) matches
      const isModifierMatch =
        (shortcut.modifiers.ctrl && (event.ctrlKey || event.metaKey)) ||
        (shortcut.modifiers.meta && (event.metaKey || event.ctrlKey));

      if (isKeyMatch && isModifierMatch && isShiftMatch && isAltMatch) {
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
        console.log('Note is auto-saved');
      },
    },
    {
      key: 'k',
      modifiers: { ctrl: true },
      description: 'Focus search',
      handler: () => {
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
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
