import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { notesService } from '../services/notesService';
import { tagsRepository } from '../database/tagsRepository';
import { CreateNoteInput, UpdateNoteInput, NoteWithContent } from '../database/schema';

export function registerNotesHandlers(): void {
  // Create note
  ipcMain.handle(
    'notes:create',
    async (event: IpcMainInvokeEvent, input: CreateNoteInput): Promise<NoteWithContent> => {
      try {
        return await notesService.createNote(input);
      } catch (error) {
        console.error('Error creating note:', error);
        throw error;
      }
    }
  );

  // Get note by ID
  ipcMain.handle(
    'notes:getById',
    async (event: IpcMainInvokeEvent, noteId: string): Promise<NoteWithContent | null> => {
      try {
        return await notesService.getNoteById(noteId);
      } catch (error) {
        console.error('Error getting note:', error);
        throw error;
      }
    }
  );

  // Get all notes
  ipcMain.handle(
    'notes:getAll',
    async (event: IpcMainInvokeEvent): Promise<NoteWithContent[]> => {
      try {
        return await notesService.getAllNotes();
      } catch (error) {
        console.error('Error getting all notes:', error);
        throw error;
      }
    }
  );

  // Update note
  ipcMain.handle(
    'notes:update',
    async (event: IpcMainInvokeEvent, input: UpdateNoteInput): Promise<NoteWithContent | null> => {
      try {
        return await notesService.updateNote(input);
      } catch (error) {
        console.error('Error updating note:', error);
        throw error;
      }
    }
  );

  // Delete note
  ipcMain.handle(
    'notes:delete',
    async (event: IpcMainInvokeEvent, noteId: string): Promise<void> => {
      try {
        await notesService.deleteNote(noteId);
      } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
      }
    }
  );

  // Search notes
  ipcMain.handle(
    'notes:search',
    async (event: IpcMainInvokeEvent, query: string): Promise<NoteWithContent[]> => {
      try {
        return await notesService.searchNotes(query);
      } catch (error) {
        console.error('Error searching notes:', error);
        throw error;
      }
    }
  );

  // Get all tags
  ipcMain.handle('notes:getAllTags', async (event: IpcMainInvokeEvent): Promise<string[]> => {
    try {
      const tags = tagsRepository.getAllTags();
      return tags.map((t) => t.name);
    } catch (error) {
      console.error('Error getting tags:', error);
      throw error;
    }
  });

  console.log('Notes IPC handlers registered');
}
