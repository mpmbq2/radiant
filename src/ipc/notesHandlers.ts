import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { notesService } from '../services/notesService';
import { tagsRepository } from '../database/tagsRepository';
import type { CreateNoteInput, UpdateNoteInput, NoteWithContent } from '../types';

/**
 * Generic wrapper for IPC handlers that provides consistent error handling.
 * Eliminates the need for repetitive try-catch-console.error-throw patterns.
 *
 * @param channel - The IPC channel name
 * @param errorContext - Descriptive context for error logging (e.g., "creating note")
 * @param handler - The actual handler function that processes the request
 */
function createHandler<TArgs extends any[], TResult>(
  channel: string,
  errorContext: string,
  handler: (...args: TArgs) => Promise<TResult>
): void {
  ipcMain.handle(channel, async (_event: IpcMainInvokeEvent, ...args: any[]): Promise<TResult> => {
    try {
      return await handler(...(args as TArgs));
    } catch (error) {
      console.error(`Error ${errorContext}:`, error);
      throw error;
    }
  });
}

export function registerNotesHandlers(): void {
  // Create note
  createHandler(
    'notes:create',
    'creating note',
    async (input: CreateNoteInput) => notesService.createNote(input)
  );

  // Get note by ID
  createHandler(
    'notes:getById',
    'getting note',
    async (noteId: string) => notesService.getNoteById(noteId)
  );

  // Get all notes
  createHandler(
    'notes:getAll',
    'getting all notes',
    async () => notesService.getAllNotes()
  );

  // Update note
  createHandler(
    'notes:update',
    'updating note',
    async (input: UpdateNoteInput) => notesService.updateNote(input)
  );

  // Delete note
  createHandler(
    'notes:delete',
    'deleting note',
    async (noteId: string) => notesService.deleteNote(noteId)
  );

  // Search notes
  createHandler(
    'notes:search',
    'searching notes',
    async (query: string) => notesService.searchNotes(query)
  );

  // Get all tags
  createHandler(
    'notes:getAllTags',
    'getting tags',
    async () => {
      const tags = tagsRepository.getAllTags();
      return tags.map((t) => t.name);
    }
  );

  console.log('Notes IPC handlers registered');
}
