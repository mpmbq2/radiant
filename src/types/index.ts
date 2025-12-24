/**
 * Centralized type definitions for Radiant
 *
 * This file serves as the single source of truth for all shared types
 * used across database, services, IPC, and renderer processes.
 */

// ============================================================================
// Database Schema Types
// ============================================================================

/**
 * Note database schema
 */
export interface Note {
  id: string;
  title: string;
  file_path: string;
  created_at: number;
  modified_at: number;
  deleted_at: number | null;
  word_count: number;
  character_count: number;
}

/**
 * Tag database schema
 */
export interface Tag {
  id: number;
  name: string;
  created_at: number;
}

/**
 * Note-Tag junction table schema
 */
export interface NoteTag {
  note_id: string;
  tag_id: number;
}

// ============================================================================
// Composite Types
// ============================================================================

/**
 * Note with content and tags (combines database + file data)
 */
export interface NoteWithContent extends Note {
  content: string;
  tags: string[];
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
}

/**
 * Input for updating an existing note
 */
export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}

// ============================================================================
// File Storage Types
// ============================================================================

/**
 * YAML frontmatter structure for markdown note files
 */
export interface NoteFrontmatter {
  title: string;
  tags: string[];
  created_at: number;
  modified_at: number;
}

// ============================================================================
// IPC API Types
// ============================================================================

/**
 * Serializable error object for IPC communication
 */
export interface IPCError {
  message: string;
  code?: string;
  stack?: string;
}

/**
 * Success response wrapper for IPC handlers
 */
export interface IPCSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response wrapper for IPC handlers
 */
export interface IPCErrorResponse {
  success: false;
  error: IPCError;
}

/**
 * Generic IPC response type (success or error)
 */
export type IPCResponse<T> = IPCSuccessResponse<T> | IPCErrorResponse;

/**
 * Notes API exposed to renderer via IPC
 */
export interface NotesAPI {
  create: (input: CreateNoteInput) => Promise<IPCResponse<NoteWithContent>>;
  getById: (noteId: string) => Promise<IPCResponse<NoteWithContent | null>>;
  getAll: () => Promise<IPCResponse<NoteWithContent[]>>;
  update: (
    input: UpdateNoteInput
  ) => Promise<IPCResponse<NoteWithContent | null>>;
  delete: (noteId: string) => Promise<IPCResponse<void>>;
  search: (query: string) => Promise<IPCResponse<NoteWithContent[]>>;
  getAllTags: () => Promise<IPCResponse<string[]>>;
}

/**
 * Electron API container exposed to renderer
 */
export interface ElectronAPI {
  notes: NotesAPI;
  getTheme: () => Promise<IPCResponse<string>>;
  setTheme: (theme: string) => Promise<IPCResponse<void>>;
}

// ============================================================================
// Global Type Declarations
// ============================================================================

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
