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
 * Notes API exposed to renderer via IPC
 */
export interface NotesAPI {
  create: (input: CreateNoteInput) => Promise<NoteWithContent>;
  getById: (noteId: string) => Promise<NoteWithContent | null>;
  getAll: () => Promise<NoteWithContent[]>;
  update: (input: UpdateNoteInput) => Promise<NoteWithContent | null>;
  delete: (noteId: string) => Promise<void>;
  search: (query: string) => Promise<NoteWithContent[]>;
  getAllTags: () => Promise<string[]>;
}

/**
 * Electron API container exposed to renderer
 */
export interface ElectronAPI {
  notes: NotesAPI;
}

// ============================================================================
// Global Type Declarations
// ============================================================================

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
