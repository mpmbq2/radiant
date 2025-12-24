import { contextBridge, ipcRenderer } from 'electron';
import type {
  CreateNoteInput,
  UpdateNoteInput,
  NoteWithContent,
  IPCResponse,
} from './types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Notes operations
  notes: {
    create: (input: CreateNoteInput): Promise<IPCResponse<NoteWithContent>> =>
      ipcRenderer.invoke('notes:create', input),

    getById: (noteId: string): Promise<IPCResponse<NoteWithContent | null>> =>
      ipcRenderer.invoke('notes:getById', noteId),

    getAll: (): Promise<IPCResponse<NoteWithContent[]>> =>
      ipcRenderer.invoke('notes:getAll'),

    update: (
      input: UpdateNoteInput
    ): Promise<IPCResponse<NoteWithContent | null>> =>
      ipcRenderer.invoke('notes:update', input),

    delete: (noteId: string): Promise<IPCResponse<void>> =>
      ipcRenderer.invoke('notes:delete', noteId),

    search: (query: string): Promise<IPCResponse<NoteWithContent[]>> =>
      ipcRenderer.invoke('notes:search', query),

    getAllTags: (): Promise<IPCResponse<string[]>> =>
      ipcRenderer.invoke('notes:getAllTags'),
  },

  // Preferences operations
  getTheme: (): Promise<IPCResponse<string>> =>
    ipcRenderer.invoke('preferences:getTheme'),

  setTheme: (theme: string): Promise<IPCResponse<void>> =>
    ipcRenderer.invoke('preferences:setTheme', theme),
});
