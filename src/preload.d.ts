import { CreateNoteInput, UpdateNoteInput, NoteWithContent } from './database/schema';

export interface NotesAPI {
  create: (input: CreateNoteInput) => Promise<NoteWithContent>;
  getById: (noteId: string) => Promise<NoteWithContent | null>;
  getAll: () => Promise<NoteWithContent[]>;
  update: (input: UpdateNoteInput) => Promise<NoteWithContent | null>;
  delete: (noteId: string) => Promise<void>;
  search: (query: string) => Promise<NoteWithContent[]>;
  getAllTags: () => Promise<string[]>;
}

export interface ElectronAPI {
  notes: NotesAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
