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
  createNote: (title: string, content?: string, tags?: string[]) => Promise<void>;
  selectNote: (noteId: string) => Promise<void>;
  updateNote: (noteId: string, updates: { title?: string; content?: string; tags?: string[] }) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
}

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
    set({ isLoading: true, error: null });
    try {
      const notes = await window.electronAPI.notes.getAll();
      set({ notes, isLoading: false });
    } catch (error) {
      console.error('Failed to load notes:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Create new note
  createNote: async (title, content = '', tags = []) => {
    set({ isLoading: true, error: null });
    try {
      const newNote = await window.electronAPI.notes.create({
        title,
        content,
        tags,
      });
      set((state) => ({
        notes: [newNote, ...state.notes],
        currentNoteId: newNote.id,
        currentNote: newNote,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to create note:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Select and load a note
  selectNote: async (noteId) => {
    set({ isLoading: true, error: null });
    try {
      const note = await window.electronAPI.notes.getById(noteId);
      set({
        currentNoteId: noteId,
        currentNote: note,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load note:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Update note
  updateNote: async (noteId, updates) => {
    try {
      const updatedNote = await window.electronAPI.notes.update({
        id: noteId,
        ...updates,
      });

      if (updatedNote) {
        set((state) => ({
          notes: state.notes.map((n) => (n.id === noteId ? updatedNote : n)),
          currentNote: state.currentNoteId === noteId ? updatedNote : state.currentNote,
        }));
      }
    } catch (error) {
      console.error('Failed to update note:', error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Delete note
  deleteNote: async (noteId) => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.notes.delete(noteId);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== noteId),
        currentNoteId: state.currentNoteId === noteId ? null : state.currentNoteId,
        currentNote: state.currentNoteId === noteId ? null : state.currentNote,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to delete note:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
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
