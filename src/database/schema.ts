/**
 * Re-export all types from centralized types file
 * This file is kept for backward compatibility but should be considered deprecated
 * Prefer importing directly from '../types' instead
 */
export type {
  Note,
  Tag,
  NoteTag,
  NoteWithContent,
  CreateNoteInput,
  UpdateNoteInput,
} from '../types';
