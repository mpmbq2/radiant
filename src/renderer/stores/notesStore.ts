import { createStore } from 'zustand/vanilla';
import type { NoteWithContent } from '../../types';

interface NotesState {
  // Data
  notes: NoteWithContent[];
  currentNoteId: string | null;
  currentNote: NoteWithContent | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // UI State
  isSidebarCollapsed: boolean;

  // Actions
  loadNotes: () => Promise<void>;
  createNote: (
    title: string,
    content?: string,
    tags?: string[]
  ) => Promise<void>;
  selectNote: (noteId: string) => Promise<void>;
  updateNote: (
    noteId: string,
    updates: { title?: string; content?: string; tags?: string[] }
  ) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
}

/**
 * Helper function to wrap async operations with consistent loading state management
 * Ensures isLoading is always reset even when errors occur
 */
const withLoading = async <T>(
  set: (
    state: Partial<NotesState> | ((state: NotesState) => Partial<NotesState>)
  ) => void,
  operation: () => Promise<T>,
  options: { rethrow?: boolean } = {}
): Promise<T | void> => {
  set({ isLoading: true, error: null });
  try {
    return await operation();
  } catch (error) {
    console.error('Operation failed:', error);
    set({ error: (error as Error).message });
    if (options.rethrow) {
      throw error;
    }
  } finally {
    set({ isLoading: false });
  }
};

export const notesStore = createStore<NotesState>((set, get) => ({
  // Initial state
  notes: [],
  currentNoteId: null,
  currentNote: null,
  searchQuery: '',
  isLoading: false,
  error: null,
  isSidebarCollapsed: false,

  // Load all notes
  loadNotes: async () => {
    await withLoading(set, async () => {
      const notes = await window.electronAPI.notes.getAll();
      set({ notes });
    });
  },

  // Create new note
  createNote: async (title, content = '', tags = []) => {
    await withLoading(
      set,
      async () => {
        const newNote = await window.electronAPI.notes.create({
          title,
          content,
          tags,
        });
        set((state) => ({
          notes: [newNote, ...state.notes],
          currentNoteId: newNote.id,
          currentNote: newNote,
        }));
      },
      { rethrow: true }
    );
  },

  // Select and load a note
  selectNote: async (noteId) => {
    await withLoading(set, async () => {
      const note = await window.electronAPI.notes.getById(noteId);
      set({
        currentNoteId: noteId,
        currentNote: note,
      });
    });
  },

  // Update note
  updateNote: async (noteId, updates) => {
    await withLoading(
      set,
      async () => {
        const updatedNote = await window.electronAPI.notes.update({
          id: noteId,
          ...updates,
        });

        if (updatedNote) {
          set((state) => ({
            notes: state.notes.map((n) => (n.id === noteId ? updatedNote : n)),
            currentNote:
              state.currentNoteId === noteId ? updatedNote : state.currentNote,
          }));
        }
      },
      { rethrow: true }
    );
  },

  // Delete note
  deleteNote: async (noteId) => {
    await withLoading(
      set,
      async () => {
        await window.electronAPI.notes.delete(noteId);
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== noteId),
          currentNoteId:
            state.currentNoteId === noteId ? null : state.currentNoteId,
          currentNote:
            state.currentNoteId === noteId ? null : state.currentNote,
        }));
      },
      { rethrow: true }
    );
  },

  // Set search query
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Toggle sidebar
  toggleSidebar: () => {
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },
}));
