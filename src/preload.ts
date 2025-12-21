import { contextBridge, ipcRenderer } from 'electron';
import type {
  CreateNoteInput,
  UpdateNoteInput,
  NoteWithContent,
} from './types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Notes operations
  notes: {
    create: (input: CreateNoteInput): Promise<NoteWithContent> =>
      ipcRenderer.invoke('notes:create', input),

    getById: (noteId: string): Promise<NoteWithContent | null> =>
      ipcRenderer.invoke('notes:getById', noteId),

    getAll: (): Promise<NoteWithContent[]> =>
      ipcRenderer.invoke('notes:getAll'),

    update: (input: UpdateNoteInput): Promise<NoteWithContent | null> =>
      ipcRenderer.invoke('notes:update', input),

    delete: (noteId: string): Promise<void> =>
      ipcRenderer.invoke('notes:delete', noteId),

    search: (query: string): Promise<NoteWithContent[]> =>
      ipcRenderer.invoke('notes:search', query),

    getAllTags: (): Promise<string[]> => ipcRenderer.invoke('notes:getAllTags'),
  },
});
