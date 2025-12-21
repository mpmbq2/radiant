import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notesStore } from './notesStore';
import type { NoteWithContent } from '../../types';

// Mock the window.electronAPI
const mockElectronAPI = {
  notes: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
    getAllTags: vi.fn(),
  },
};

// Set up global window object with mocked API
(global as any).window = {
  electronAPI: mockElectronAPI,
};

describe('notesStore', () => {
  const mockNote: NoteWithContent = {
    id: 'test-note-1',
    title: 'Test Note',
    content: 'Test content',
    tags: ['test'],
    file_path: '/path/to/note.md',
    created_at: Date.now(),
    modified_at: Date.now(),
    deleted_at: null,
    word_count: 2,
    character_count: 12,
  };

  beforeEach(() => {
    // Reset store state
    notesStore.setState({
      notes: [],
      currentNoteId: null,
      currentNote: null,
      searchQuery: '',
      isLoading: false,
      error: null,
      isSidebarCollapsed: false,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = notesStore.getState();
      expect(state.notes).toEqual([]);
      expect(state.currentNoteId).toBeNull();
      expect(state.currentNote).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isSidebarCollapsed).toBe(false);
    });
  });

  describe('loadNotes', () => {
    it('should load notes successfully', async () => {
      const mockNotes = [mockNote];
      mockElectronAPI.notes.getAll.mockResolvedValue(mockNotes);

      await notesStore.getState().loadNotes();

      const state = notesStore.getState();
      expect(state.notes).toEqual(mockNotes);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading state during operation', async () => {
      mockElectronAPI.notes.getAll.mockImplementation(() => {
        const state = notesStore.getState();
        expect(state.isLoading).toBe(true);
        return Promise.resolve([]);
      });

      await notesStore.getState().loadNotes();
    });

    it('should handle errors', async () => {
      const errorMessage = 'Failed to load notes';
      mockElectronAPI.notes.getAll.mockRejectedValue(new Error(errorMessage));

      await notesStore.getState().loadNotes();

      const state = notesStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
    });

    it('should clear previous error on successful load', async () => {
      // Set initial error state
      notesStore.setState({ error: 'Previous error' });

      mockElectronAPI.notes.getAll.mockResolvedValue([mockNote]);
      await notesStore.getState().loadNotes();

      const state = notesStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('createNote', () => {
    it('should create a note successfully', async () => {
      mockElectronAPI.notes.create.mockResolvedValue(mockNote);

      await notesStore.getState().createNote('Test Note', 'Test content', ['test']);

      const state = notesStore.getState();
      expect(state.notes).toHaveLength(1);
      expect(state.notes[0]).toEqual(mockNote);
      expect(state.currentNoteId).toBe(mockNote.id);
      expect(state.currentNote).toEqual(mockNote);
    });

    it('should add note to beginning of notes array', async () => {
      const existingNote: NoteWithContent = { ...mockNote, id: 'existing-note' };
      notesStore.setState({ notes: [existingNote] });

      const newNote: NoteWithContent = { ...mockNote, id: 'new-note' };
      mockElectronAPI.notes.create.mockResolvedValue(newNote);

      await notesStore.getState().createNote('New Note', 'Content', []);

      const state = notesStore.getState();
      expect(state.notes).toHaveLength(2);
      expect(state.notes[0].id).toBe('new-note');
      expect(state.notes[1].id).toBe('existing-note');
    });

    it('should handle creation errors', async () => {
      const errorMessage = 'Failed to create note';
      mockElectronAPI.notes.create.mockRejectedValue(new Error(errorMessage));

      await expect(
        notesStore.getState().createNote('Test', 'Content', [])
      ).rejects.toThrow();

      const state = notesStore.getState();
      expect(state.error).toBe(errorMessage);
    });

    it('should call create with correct parameters', async () => {
      mockElectronAPI.notes.create.mockResolvedValue(mockNote);

      await notesStore.getState().createNote('Title', 'Content', ['tag1', 'tag2']);

      expect(mockElectronAPI.notes.create).toHaveBeenCalledWith({
        title: 'Title',
        content: 'Content',
        tags: ['tag1', 'tag2'],
      });
    });
  });

  describe('selectNote', () => {
    it('should select a note successfully', async () => {
      mockElectronAPI.notes.getById.mockResolvedValue(mockNote);

      await notesStore.getState().selectNote(mockNote.id);

      const state = notesStore.getState();
      expect(state.currentNoteId).toBe(mockNote.id);
      expect(state.currentNote).toEqual(mockNote);
    });

    it('should load note content when selecting', async () => {
      mockElectronAPI.notes.getById.mockResolvedValue(mockNote);

      await notesStore.getState().selectNote(mockNote.id);

      expect(mockElectronAPI.notes.getById).toHaveBeenCalledWith(mockNote.id);
    });

    it('should handle selection errors', async () => {
      const errorMessage = 'Failed to get note';
      mockElectronAPI.notes.getById.mockRejectedValue(new Error(errorMessage));

      await notesStore.getState().selectNote('some-id');

      const state = notesStore.getState();
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('updateNote', () => {
    it('should update a note successfully', async () => {
      const updatedNote: NoteWithContent = { ...mockNote, title: 'Updated Title' };
      notesStore.setState({ notes: [mockNote], currentNoteId: mockNote.id, currentNote: mockNote });

      mockElectronAPI.notes.update.mockResolvedValue(updatedNote);

      await notesStore.getState().updateNote(mockNote.id, { title: 'Updated Title' });

      const state = notesStore.getState();
      expect(state.notes[0].title).toBe('Updated Title');
      expect(state.currentNote?.title).toBe('Updated Title');
    });

    it('should update note in notes array', async () => {
      const note1: NoteWithContent = { ...mockNote, id: 'note-1', title: 'Note 1' };
      const note2: NoteWithContent = { ...mockNote, id: 'note-2', title: 'Note 2' };
      notesStore.setState({ notes: [note1, note2] });

      const updatedNote2: NoteWithContent = { ...note2, title: 'Updated Note 2' };
      mockElectronAPI.notes.update.mockResolvedValue(updatedNote2);

      await notesStore.getState().updateNote('note-2', { title: 'Updated Note 2' });

      const state = notesStore.getState();
      expect(state.notes[0].title).toBe('Note 1');
      expect(state.notes[1].title).toBe('Updated Note 2');
    });

    it('should update currentNote if it is the updated note', async () => {
      const updatedNote: NoteWithContent = { ...mockNote, content: 'Updated content' };
      notesStore.setState({
        notes: [mockNote],
        currentNoteId: mockNote.id,
        currentNote: mockNote
      });

      mockElectronAPI.notes.update.mockResolvedValue(updatedNote);

      await notesStore.getState().updateNote(mockNote.id, { content: 'Updated content' });

      const state = notesStore.getState();
      expect(state.currentNote?.content).toBe('Updated content');
    });

    it('should not update currentNote if different note is updated', async () => {
      const currentNote: NoteWithContent = { ...mockNote, id: 'current-note' };
      const otherNote: NoteWithContent = { ...mockNote, id: 'other-note' };
      notesStore.setState({
        notes: [currentNote, otherNote],
        currentNoteId: 'current-note',
        currentNote: currentNote
      });

      const updatedOther: NoteWithContent = { ...otherNote, title: 'Updated' };
      mockElectronAPI.notes.update.mockResolvedValue(updatedOther);

      await notesStore.getState().updateNote('other-note', { title: 'Updated' });

      const state = notesStore.getState();
      expect(state.currentNote?.id).toBe('current-note');
      expect(state.currentNote?.title).toBe(currentNote.title);
    });

    it('should handle update errors', async () => {
      const errorMessage = 'Failed to update note';
      mockElectronAPI.notes.update.mockRejectedValue(new Error(errorMessage));

      await expect(
        notesStore.getState().updateNote('note-id', { title: 'New Title' })
      ).rejects.toThrow();

      const state = notesStore.getState();
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note successfully', async () => {
      notesStore.setState({ notes: [mockNote] });
      mockElectronAPI.notes.delete.mockResolvedValue(undefined);

      await notesStore.getState().deleteNote(mockNote.id);

      const state = notesStore.getState();
      expect(state.notes).toHaveLength(0);
    });

    it('should remove note from notes array', async () => {
      const note1: NoteWithContent = { ...mockNote, id: 'note-1' };
      const note2: NoteWithContent = { ...mockNote, id: 'note-2' };
      notesStore.setState({ notes: [note1, note2] });

      mockElectronAPI.notes.delete.mockResolvedValue(undefined);

      await notesStore.getState().deleteNote('note-1');

      const state = notesStore.getState();
      expect(state.notes).toHaveLength(1);
      expect(state.notes[0].id).toBe('note-2');
    });

    it('should clear currentNote if deleted note is current', async () => {
      notesStore.setState({
        notes: [mockNote],
        currentNoteId: mockNote.id,
        currentNote: mockNote
      });

      mockElectronAPI.notes.delete.mockResolvedValue(undefined);

      await notesStore.getState().deleteNote(mockNote.id);

      const state = notesStore.getState();
      expect(state.currentNoteId).toBeNull();
      expect(state.currentNote).toBeNull();
    });

    it('should not clear currentNote if different note is deleted', async () => {
      const currentNote: NoteWithContent = { ...mockNote, id: 'current-note' };
      const otherNote: NoteWithContent = { ...mockNote, id: 'other-note' };
      notesStore.setState({
        notes: [currentNote, otherNote],
        currentNoteId: 'current-note',
        currentNote: currentNote
      });

      mockElectronAPI.notes.delete.mockResolvedValue(undefined);

      await notesStore.getState().deleteNote('other-note');

      const state = notesStore.getState();
      expect(state.currentNoteId).toBe('current-note');
      expect(state.currentNote).toEqual(currentNote);
    });

    it('should handle deletion errors', async () => {
      const errorMessage = 'Failed to delete note';
      mockElectronAPI.notes.delete.mockRejectedValue(new Error(errorMessage));

      await expect(
        notesStore.getState().deleteNote('note-id')
      ).rejects.toThrow();

      const state = notesStore.getState();
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('setSearchQuery', () => {
    it('should update search query', () => {
      notesStore.getState().setSearchQuery('test query');

      const state = notesStore.getState();
      expect(state.searchQuery).toBe('test query');
    });

    it('should handle empty search query', () => {
      notesStore.setState({ searchQuery: 'previous query' });
      notesStore.getState().setSearchQuery('');

      const state = notesStore.getState();
      expect(state.searchQuery).toBe('');
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar from collapsed to expanded', () => {
      notesStore.setState({ isSidebarCollapsed: true });
      notesStore.getState().toggleSidebar();

      const state = notesStore.getState();
      expect(state.isSidebarCollapsed).toBe(false);
    });

    it('should toggle sidebar from expanded to collapsed', () => {
      notesStore.setState({ isSidebarCollapsed: false });
      notesStore.getState().toggleSidebar();

      const state = notesStore.getState();
      expect(state.isSidebarCollapsed).toBe(true);
    });

    it('should toggle multiple times', () => {
      notesStore.getState().toggleSidebar();
      expect(notesStore.getState().isSidebarCollapsed).toBe(true);

      notesStore.getState().toggleSidebar();
      expect(notesStore.getState().isSidebarCollapsed).toBe(false);

      notesStore.getState().toggleSidebar();
      expect(notesStore.getState().isSidebarCollapsed).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should reset error on successful operation', async () => {
      notesStore.setState({ error: 'Previous error' });
      mockElectronAPI.notes.getAll.mockResolvedValue([]);

      await notesStore.getState().loadNotes();

      const state = notesStore.getState();
      expect(state.error).toBeNull();
    });

    it('should reset loading state even when error occurs', async () => {
      mockElectronAPI.notes.getAll.mockRejectedValue(new Error('Test error'));

      await notesStore.getState().loadNotes();

      const state = notesStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });
});
