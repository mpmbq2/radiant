import { getNotesService } from '../services/notesService';
import { getTagsRepository } from '../database/tagsRepository';
import { createLogger } from '../utils/logger';
import { createHandler } from './utils/createIpcHandler';
import type {
  CreateNoteInput,
  UpdateNoteInput,
  NoteWithContent,
} from '../types';

const logger = createLogger('NotesHandlers');

export function registerNotesHandlers(): void {
  const notesService = getNotesService();

  // Create note
  createHandler(
    'notes:create',
    'creating note',
    async (input: CreateNoteInput) => notesService.createNote(input),
    logger
  );

  // Get note by ID
  createHandler(
    'notes:getById',
    'getting note',
    async (noteId: string) => notesService.getNoteById(noteId),
    logger
  );

  // Get all notes
  createHandler(
    'notes:getAll',
    'getting all notes',
    async () => notesService.getAllNotes(),
    logger
  );

  // Update note
  createHandler(
    'notes:update',
    'updating note',
    async (input: UpdateNoteInput) => notesService.updateNote(input),
    logger
  );

  // Delete note
  createHandler(
    'notes:delete',
    'deleting note',
    async (noteId: string) => notesService.deleteNote(noteId),
    logger
  );

  // Search notes
  createHandler(
    'notes:search',
    'searching notes',
    async (query: string) => notesService.searchNotes(query),
    logger
  );

  // Get all tags
  createHandler(
    'notes:getAllTags',
    'getting tags',
    async () => {
      const tags = getTagsRepository().getAllTags();
      return tags.map((t) => t.name);
    },
    logger
  );

  logger.info('Notes IPC handlers registered');
}
