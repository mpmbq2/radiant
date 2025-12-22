import { createStore } from 'zustand/vanilla';
import { withLoading } from '../utils/withLoading';
import type { NoteWithContent } from '../../types';
import type { FilterInterface } from '../../filters';
import { registerBuiltInFilters } from '../../filters';

// Initialize filter registry
registerBuiltInFilters();

interface NotesState {
  // Data
  notes: NoteWithContent[];
  currentNoteId: string | null;
  currentNote: NoteWithContent | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Filter State
  activeFilters: FilterInterface[];

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

  // Filter Actions
  addFilter: (filter: FilterInterface) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  getFilteredNotes: () => NoteWithContent[];
}

export const notesStore = createStore<NotesState>((set, get) => ({
  // Initial state
  notes: [],
  currentNoteId: null,
  currentNote: null,
  searchQuery: '',
  isLoading: false,
  error: null,
  activeFilters: [],
  isSidebarCollapsed: false,

  // Load all notes
  loadNotes: async () => {
    await withLoading(
      set,
      async () => {
        const notes = await window.electronAPI.notes.getAll();
        set({ notes });
      },
      'Load notes'
    );
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
      'Create note',
      { rethrow: true }
    );
  },

  // Select and load a note
  selectNote: async (noteId) => {
    await withLoading(
      set,
      async () => {
        const note = await window.electronAPI.notes.getById(noteId);
        set({
          currentNoteId: noteId,
          currentNote: note,
        });
      },
      'Select note'
    );
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
      'Update note',
      { rethrow: true, silent: true }
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
      'Delete note',
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

  // Add filter
  addFilter: (filter) => {
    set((state) => ({
      activeFilters: [...state.activeFilters, filter],
    }));
  },

  // Remove filter by index
  removeFilter: (index) => {
    set((state) => ({
      activeFilters: state.activeFilters.filter((_, i) => i !== index),
    }));
  },

  // Clear all filters
  clearFilters: () => {
    set({ activeFilters: [] });
  },

  // Get filtered notes
  getFilteredNotes: () => {
    const state = get();
    let filtered = state.notes;

    // Apply all active filters sequentially
    for (const filter of state.activeFilters) {
      filtered = filter.applyWithContent(filtered);
    }

    // Apply search query if present
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  },
}));
