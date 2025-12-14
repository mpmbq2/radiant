# Phase 1: Core Data Layer and CRUD Operations - Detailed Implementation Plan

**Objective**: Build a robust data persistence layer using SQLite for metadata and the file system for Markdown content, with a secure IPC API exposing CRUD operations to the renderer process.

**Duration**: 2-3 days
**Ownership**: 100% AI-generated
**Dependencies**: Phase 0 complete

---

## Architecture Overview

Phase 1 establishes a dual-storage architecture:

### Storage Strategy:
1. **SQLite Database** (metadata): Stores note metadata, timestamps, tags, and search indices
2. **File System** (content): Stores actual note content as Markdown files with YAML frontmatter

### Architecture Components:
- **Database Manager** (main process): Handles SQLite connections and queries
- **File Manager** (main process): Manages Markdown file I/O operations
- **Notes Service** (main process): Orchestrates database and file operations
- **IPC Handlers** (main process): Exposes CRUD operations via Electron IPC
- **Typed API** (preload): Type-safe bridge to renderer process

### Why This Architecture?
- **Metadata in SQLite**: Fast queries, full-text search, relational data
- **Content in Markdown**: Human-readable, portable, version-control friendly
- **Separation of concerns**: Database handles structure, files handle content
- **Future-proof**: Can migrate to cloud storage or add sync later

---

## Implementation Steps

### Task 1.1: Install Required Dependencies
**File(s)**:
- `package.json` (modified)

**Estimated Time**: 10 minutes

**Actions**:
1. Install better-sqlite3 (native SQLite binding):
   ```bash
   npm install better-sqlite3
   npm install --save-dev @types/better-sqlite3
   ```

2. Install gray-matter (YAML frontmatter parser):
   ```bash
   npm install gray-matter
   npm install --save-dev @types/gray-matter
   ```

3. Install additional utilities:
   ```bash
   npm install uuid
   npm install --save-dev @types/uuid
   ```

4. Verify dependencies appear in `package.json`

**Success Criteria**:
- `better-sqlite3` in dependencies
- `gray-matter` in dependencies
- `uuid` in dependencies
- All type definitions in devDependencies

**Potential Issues**:
- Native module compilation errors: Ensure build tools are installed (Python, C++ compiler)
- macOS: May need Xcode Command Line Tools: `xcode-select --install`
- Windows: May need windows-build-tools: `npm install --global windows-build-tools`

---

### Task 1.2: Create Database Schema Definition
**File(s)**:
- `src/database/schema.sql` (new)
- `src/database/schema.ts` (new)

**Estimated Time**: 25 minutes

**Actions**:
1. Create `src/database/` directory:
   ```bash
   mkdir -p src/database
   ```

2. Create `src/database/schema.sql`:
   ```sql
   -- Notes table: stores metadata about each note
   CREATE TABLE IF NOT EXISTS notes (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     file_path TEXT NOT NULL UNIQUE,
     created_at INTEGER NOT NULL,
     modified_at INTEGER NOT NULL,
     deleted_at INTEGER DEFAULT NULL,
     word_count INTEGER DEFAULT 0,
     character_count INTEGER DEFAULT 0
   );

   -- Tags table: stores all unique tags
   CREATE TABLE IF NOT EXISTS tags (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL UNIQUE,
     created_at INTEGER NOT NULL
   );

   -- Note-Tag junction table: many-to-many relationship
   CREATE TABLE IF NOT EXISTS note_tags (
     note_id TEXT NOT NULL,
     tag_id INTEGER NOT NULL,
     PRIMARY KEY (note_id, tag_id),
     FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
     FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
   );

   -- Indexes for performance
   CREATE INDEX IF NOT EXISTS idx_notes_modified_at ON notes(modified_at);
   CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
   CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
   CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
   CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
   ```

3. Create `src/database/schema.ts` (TypeScript types):
   ```typescript
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

   export interface Tag {
     id: number;
     name: string;
     created_at: number;
   }

   export interface NoteTag {
     note_id: string;
     tag_id: number;
   }

   export interface NoteWithContent extends Note {
     content: string;
     tags: string[];
   }

   export interface CreateNoteInput {
     title: string;
     content: string;
     tags?: string[];
   }

   export interface UpdateNoteInput {
     id: string;
     title?: string;
     content?: string;
     tags?: string[];
   }
   ```

**Success Criteria**:
- SQL schema defines all tables with proper relationships
- Indexes created for frequently queried columns
- TypeScript interfaces match database schema
- Foreign key constraints defined for referential integrity

**Potential Issues**:
- None expected - this is just schema definition

---

### Task 1.3: Create Database Connection Manager
**File(s)**:
- `src/database/connection.ts` (new)
- `src/config.ts` (new)

**Estimated Time**: 30 minutes

**Actions**:
1. Create `src/config.ts` for app-wide configuration:
   ```typescript
   import { app } from 'electron';
   import path from 'path';

   export const CONFIG = {
     // User data directory (platform-specific)
     USER_DATA_DIR: app.getPath('userData'),

     // Database file location
     get DATABASE_PATH() {
       return path.join(this.USER_DATA_DIR, 'radiant.db');
     },

     // Notes directory location
     get NOTES_DIR() {
       return path.join(this.USER_DATA_DIR, 'notes');
     },

     // Application settings
     DATABASE_WAL_MODE: true,
     DATABASE_TIMEOUT: 5000,
     AUTO_SAVE_INTERVAL: 30000, // 30 seconds
   };
   ```

2. Create `src/database/connection.ts`:
   ```typescript
   import Database from 'better-sqlite3';
   import fs from 'fs';
   import path from 'path';
   import { CONFIG } from '../config';

   let db: Database.Database | null = null;

   export function initializeDatabase(): Database.Database {
     // Ensure user data directory exists
     if (!fs.existsSync(CONFIG.USER_DATA_DIR)) {
       fs.mkdirSync(CONFIG.USER_DATA_DIR, { recursive: true });
     }

     // Create database connection
     db = new Database(CONFIG.DATABASE_PATH, {
       verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
     });

     // Enable WAL mode for better concurrency
     if (CONFIG.DATABASE_WAL_MODE) {
       db.pragma('journal_mode = WAL');
     }

     // Set timeout for busy database
     db.pragma(`busy_timeout = ${CONFIG.DATABASE_TIMEOUT}`);

     // Enable foreign keys
     db.pragma('foreign_keys = ON');

     // Optimize for performance
     db.pragma('synchronous = NORMAL');
     db.pragma('cache_size = 10000');
     db.pragma('temp_store = MEMORY');

     console.log(`Database initialized at: ${CONFIG.DATABASE_PATH}`);
     console.log(`WAL mode: ${db.pragma('journal_mode', { simple: true })}`);

     return db;
   }

   export function getDatabase(): Database.Database {
     if (!db) {
       throw new Error('Database not initialized. Call initializeDatabase() first.');
     }
     return db;
   }

   export function closeDatabase(): void {
     if (db) {
       db.close();
       db = null;
       console.log('Database connection closed');
     }
   }
   ```

**Success Criteria**:
- Database file created in user data directory
- WAL mode enabled for better performance
- Foreign keys enforced
- Performance pragmas applied
- Error thrown if database accessed before initialization

**Potential Issues**:
- Permission errors: User data directory may not be writable
- WAL mode issues on network drives: Falls back to DELETE mode automatically

---

### Task 1.4: Run Database Migrations
**File(s)**:
- `src/database/migrations.ts` (new)

**Estimated Time**: 25 minutes

**Actions**:
1. Create `src/database/migrations.ts`:
   ```typescript
   import fs from 'fs';
   import path from 'path';
   import { getDatabase } from './connection';

   export function runMigrations(): void {
     const db = getDatabase();

     // Read schema SQL file
     const schemaPath = path.join(__dirname, 'schema.sql');
     const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

     // Execute schema (CREATE TABLE IF NOT EXISTS is idempotent)
     db.exec(schemaSql);

     console.log('Database migrations completed');

     // Verify tables exist
     const tables = db
       .prepare(
         `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
       )
       .all();

     console.log('Database tables:', tables);
   }

   export function resetDatabase(): void {
     const db = getDatabase();

     // Drop all tables (useful for development)
     db.exec(`
       DROP TABLE IF EXISTS note_tags;
       DROP TABLE IF EXISTS tags;
       DROP TABLE IF EXISTS notes;
     `);

     console.log('Database reset complete');

     // Re-run migrations
     runMigrations();
   }
   ```

2. Update `src/main.ts` to initialize database on app start:
   ```typescript
   import { initializeDatabase } from './database/connection';
   import { runMigrations } from './database/migrations';

   // Add before createWindow():
   app.on('ready', () => {
     try {
       initializeDatabase();
       runMigrations();
       createWindow();
     } catch (error) {
       console.error('Failed to initialize database:', error);
       app.quit();
     }
   });
   ```

3. Add cleanup on app quit:
   ```typescript
   import { closeDatabase } from './database/connection';

   app.on('will-quit', () => {
     closeDatabase();
   });
   ```

**Success Criteria**:
- Database tables created on first app launch
- Migrations run successfully without errors
- Tables verified in console output
- Database connection closed on app quit

**Potential Issues**:
- Schema file not found: Ensure TypeScript copies .sql files to output directory
- Fix: Add to `tsconfig.json`: `"include": ["src/**/*"]`
- Fix: Ensure build process copies .sql files

---

### Task 1.5: Create File System Manager
**File(s)**:
- `src/storage/fileManager.ts` (new)

**Estimated Time**: 35 minutes

**Actions**:
1. Create `src/storage/` directory:
   ```bash
   mkdir -p src/storage
   ```

2. Create `src/storage/fileManager.ts`:
   ```typescript
   import fs from 'fs';
   import path from 'path';
   import matter from 'gray-matter';
   import { CONFIG } from '../config';

   export interface NoteFrontmatter {
     title: string;
     tags: string[];
     created_at: number;
     modified_at: number;
   }

   export class FileManager {
     private notesDir: string;

     constructor(notesDir?: string) {
       this.notesDir = notesDir || CONFIG.NOTES_DIR;
       this.ensureNotesDirectory();
     }

     private ensureNotesDirectory(): void {
       if (!fs.existsSync(this.notesDir)) {
         fs.mkdirSync(this.notesDir, { recursive: true });
         console.log(`Created notes directory: ${this.notesDir}`);
       }
     }

     /**
      * Generate a file path for a note
      */
     generateFilePath(noteId: string): string {
       return path.join(this.notesDir, `${noteId}.md`);
     }

     /**
      * Write note content to file with frontmatter
      */
     writeNote(
       filePath: string,
       content: string,
       frontmatter: NoteFrontmatter
     ): void {
       const fileContent = matter.stringify(content, frontmatter);
       fs.writeFileSync(filePath, fileContent, 'utf-8');
       console.log(`Note written to: ${filePath}`);
     }

     /**
      * Read note content from file
      */
     readNote(filePath: string): { content: string; frontmatter: NoteFrontmatter } {
       if (!fs.existsSync(filePath)) {
         throw new Error(`Note file not found: ${filePath}`);
       }

       const fileContent = fs.readFileSync(filePath, 'utf-8');
       const parsed = matter(fileContent);

       return {
         content: parsed.content,
         frontmatter: parsed.data as NoteFrontmatter,
       };
     }

     /**
      * Delete note file
      */
     deleteNote(filePath: string): void {
       if (fs.existsSync(filePath)) {
         fs.unlinkSync(filePath);
         console.log(`Note deleted: ${filePath}`);
       }
     }

     /**
      * Check if note file exists
      */
     noteExists(filePath: string): boolean {
       return fs.existsSync(filePath);
     }

     /**
      * Get all note file paths
      */
     getAllNoteFiles(): string[] {
       if (!fs.existsSync(this.notesDir)) {
         return [];
       }

       return fs
         .readdirSync(this.notesDir)
         .filter((file) => file.endsWith('.md'))
         .map((file) => path.join(this.notesDir, file));
     }
   }

   // Singleton instance
   export const fileManager = new FileManager();
   ```

**Success Criteria**:
- Notes directory created in user data folder
- Can write Markdown files with YAML frontmatter
- Can read and parse frontmatter correctly
- Can delete note files
- Can list all note files

**Potential Issues**:
- File system permissions: User data directory should be writable
- Concurrent writes: WAL mode in SQLite helps, but file system doesn't have transactions
- Solution: Implement file locking in future phases if needed

---

### Task 1.6: Create Notes Repository (Database Operations)
**File(s)**:
- `src/database/notesRepository.ts` (new)

**Estimated Time**: 45 minutes

**Actions**:
1. Create `src/database/notesRepository.ts`:
   ```typescript
   import { v4 as uuidv4 } from 'uuid';
   import { getDatabase } from './connection';
   import { Note, NoteWithContent, CreateNoteInput, UpdateNoteInput } from './schema';

   export class NotesRepository {
     /**
      * Create a new note (database only, no file content)
      */
     createNote(noteId: string, title: string, filePath: string): Note {
       const db = getDatabase();
       const now = Date.now();

       const stmt = db.prepare(`
         INSERT INTO notes (id, title, file_path, created_at, modified_at, word_count, character_count)
         VALUES (?, ?, ?, ?, ?, 0, 0)
       `);

       stmt.run(noteId, title, filePath, now, now);

       return {
         id: noteId,
         title,
         file_path: filePath,
         created_at: now,
         modified_at: now,
         deleted_at: null,
         word_count: 0,
         character_count: 0,
       };
     }

     /**
      * Get note by ID
      */
     getNoteById(noteId: string): Note | null {
       const db = getDatabase();
       const stmt = db.prepare('SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL');
       const result = stmt.get(noteId) as Note | undefined;
       return result || null;
     }

     /**
      * Get all notes (excluding deleted)
      */
     getAllNotes(): Note[] {
       const db = getDatabase();
       const stmt = db.prepare(`
         SELECT * FROM notes
         WHERE deleted_at IS NULL
         ORDER BY modified_at DESC
       `);
       return stmt.all() as Note[];
     }

     /**
      * Update note metadata
      */
     updateNote(
       noteId: string,
       updates: {
         title?: string;
         word_count?: number;
         character_count?: number;
       }
     ): void {
       const db = getDatabase();
       const now = Date.now();

       const fields: string[] = ['modified_at = ?'];
       const values: any[] = [now];

       if (updates.title !== undefined) {
         fields.push('title = ?');
         values.push(updates.title);
       }
       if (updates.word_count !== undefined) {
         fields.push('word_count = ?');
         values.push(updates.word_count);
       }
       if (updates.character_count !== undefined) {
         fields.push('character_count = ?');
         values.push(updates.character_count);
       }

       values.push(noteId);

       const stmt = db.prepare(`
         UPDATE notes
         SET ${fields.join(', ')}
         WHERE id = ?
       `);

       stmt.run(...values);
     }

     /**
      * Soft delete a note
      */
     deleteNote(noteId: string): void {
       const db = getDatabase();
       const now = Date.now();

       const stmt = db.prepare('UPDATE notes SET deleted_at = ? WHERE id = ?');
       stmt.run(now, noteId);
     }

     /**
      * Permanently delete a note
      */
     permanentlyDeleteNote(noteId: string): void {
       const db = getDatabase();
       const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
       stmt.run(noteId);
     }

     /**
      * Search notes by title
      */
     searchNotesByTitle(query: string): Note[] {
       const db = getDatabase();
       const stmt = db.prepare(`
         SELECT * FROM notes
         WHERE title LIKE ? AND deleted_at IS NULL
         ORDER BY modified_at DESC
       `);
       return stmt.all(`%${query}%`) as Note[];
     }
   }

   // Singleton instance
   export const notesRepository = new NotesRepository();
   ```

**Success Criteria**:
- Can create note records in database
- Can retrieve notes by ID and get all notes
- Can update note metadata
- Can soft delete notes (sets deleted_at timestamp)
- Can search notes by title

**Potential Issues**:
- SQL injection: Using prepared statements prevents this
- Unique constraint violations: Should be handled by caller

---

### Task 1.7: Create Tags Repository
**File(s)**:
- `src/database/tagsRepository.ts` (new)

**Estimated Time**: 35 minutes

**Actions**:
1. Create `src/database/tagsRepository.ts`:
   ```typescript
   import { getDatabase } from './connection';
   import { Tag } from './schema';

   export class TagsRepository {
     /**
      * Get or create a tag by name
      */
     getOrCreateTag(tagName: string): Tag {
       const db = getDatabase();
       const normalized = tagName.toLowerCase().trim();

       // Try to get existing tag
       const existing = db
         .prepare('SELECT * FROM tags WHERE name = ?')
         .get(normalized) as Tag | undefined;

       if (existing) {
         return existing;
       }

       // Create new tag
       const now = Date.now();
       const result = db
         .prepare('INSERT INTO tags (name, created_at) VALUES (?, ?) RETURNING *')
         .get(normalized, now) as Tag;

       return result;
     }

     /**
      * Get all tags
      */
     getAllTags(): Tag[] {
       const db = getDatabase();
       return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
     }

     /**
      * Get tags for a specific note
      */
     getTagsForNote(noteId: string): string[] {
       const db = getDatabase();
       const result = db
         .prepare(
           `
         SELECT t.name
         FROM tags t
         INNER JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = ?
         ORDER BY t.name
       `
         )
         .all(noteId) as { name: string }[];

       return result.map((r) => r.name);
     }

     /**
      * Set tags for a note (replaces existing tags)
      */
     setTagsForNote(noteId: string, tagNames: string[]): void {
       const db = getDatabase();

       // Start transaction
       const transaction = db.transaction(() => {
         // Remove existing tags
         db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);

         // Add new tags
         for (const tagName of tagNames) {
           const tag = this.getOrCreateTag(tagName);
           db.prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(
             noteId,
             tag.id
           );
         }
       });

       transaction();
     }

     /**
      * Get notes with a specific tag
      */
     getNotesWithTag(tagName: string): string[] {
       const db = getDatabase();
       const normalized = tagName.toLowerCase().trim();

       const result = db
         .prepare(
           `
         SELECT nt.note_id
         FROM note_tags nt
         INNER JOIN tags t ON nt.tag_id = t.id
         WHERE t.name = ?
       `
         )
         .all(normalized) as { note_id: string }[];

       return result.map((r) => r.note_id);
     }

     /**
      * Delete unused tags
      */
     deleteUnusedTags(): number {
       const db = getDatabase();
       const result = db
         .prepare(
           `
         DELETE FROM tags
         WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)
       `
         )
         .run();

       return result.changes;
     }
   }

   // Singleton instance
   export const tagsRepository = new TagsRepository();
   ```

**Success Criteria**:
- Can create and retrieve tags
- Tags are normalized (lowercase, trimmed)
- Can associate tags with notes
- Can get all tags for a note
- Can clean up unused tags

**Potential Issues**:
- Tag normalization: Ensure consistent formatting
- Transaction safety: Using db.transaction() for atomic operations

---

### Task 1.8: Create Notes Service (Orchestration Layer)
**File(s)**:
- `src/services/notesService.ts` (new)

**Estimated Time**: 45 minutes

**Actions**:
1. Create `src/services/` directory:
   ```bash
   mkdir -p src/services
   ```

2. Create `src/services/notesService.ts`:
   ```typescript
   import { v4 as uuidv4 } from 'uuid';
   import { notesRepository } from '../database/notesRepository';
   import { tagsRepository } from '../database/tagsRepository';
   import { fileManager } from '../storage/fileManager';
   import { NoteWithContent, CreateNoteInput, UpdateNoteInput } from '../database/schema';

   export class NotesService {
     /**
      * Create a new note (database + file)
      */
     async createNote(input: CreateNoteInput): Promise<NoteWithContent> {
       const noteId = uuidv4();
       const filePath = fileManager.generateFilePath(noteId);
       const now = Date.now();

       // Create database record
       const note = notesRepository.createNote(noteId, input.title, filePath);

       // Write file
       fileManager.writeNote(filePath, input.content || '', {
         title: input.title,
         tags: input.tags || [],
         created_at: now,
         modified_at: now,
       });

       // Set tags if provided
       if (input.tags && input.tags.length > 0) {
         tagsRepository.setTagsForNote(noteId, input.tags);
       }

       // Calculate word count
       const wordCount = this.countWords(input.content || '');
       const charCount = (input.content || '').length;

       notesRepository.updateNote(noteId, {
         word_count: wordCount,
         character_count: charCount,
       });

       return {
         ...note,
         content: input.content || '',
         tags: input.tags || [],
         word_count: wordCount,
         character_count: charCount,
       };
     }

     /**
      * Get note by ID with content
      */
     async getNoteById(noteId: string): Promise<NoteWithContent | null> {
       const note = notesRepository.getNoteById(noteId);
       if (!note) {
         return null;
       }

       // Read file content
       const { content } = fileManager.readNote(note.file_path);
       const tags = tagsRepository.getTagsForNote(noteId);

       return {
         ...note,
         content,
         tags,
       };
     }

     /**
      * Get all notes with content
      */
     async getAllNotes(): Promise<NoteWithContent[]> {
       const notes = notesRepository.getAllNotes();

       return notes.map((note) => {
         try {
           const { content } = fileManager.readNote(note.file_path);
           const tags = tagsRepository.getTagsForNote(note.id);

           return {
             ...note,
             content,
             tags,
           };
         } catch (error) {
           console.error(`Error reading note ${note.id}:`, error);
           return {
             ...note,
             content: '',
             tags: [],
           };
         }
       });
     }

     /**
      * Update note
      */
     async updateNote(input: UpdateNoteInput): Promise<NoteWithContent | null> {
       const note = notesRepository.getNoteById(input.id);
       if (!note) {
         return null;
       }

       const now = Date.now();
       const updates: any = {};

       // Update title if provided
       if (input.title !== undefined) {
         updates.title = input.title;
       }

       // Update content if provided
       let content = '';
       if (input.content !== undefined) {
         content = input.content;

         // Read current frontmatter
         const currentFile = fileManager.readNote(note.file_path);

         // Write updated file
         fileManager.writeNote(note.file_path, content, {
           ...currentFile.frontmatter,
           title: input.title || note.title,
           modified_at: now,
           tags: input.tags || currentFile.frontmatter.tags,
         });

         // Update word count
         updates.word_count = this.countWords(content);
         updates.character_count = content.length;
       }

       // Update tags if provided
       if (input.tags !== undefined) {
         tagsRepository.setTagsForNote(input.id, input.tags);
       }

       // Update database
       if (Object.keys(updates).length > 0) {
         notesRepository.updateNote(input.id, updates);
       }

       // Return updated note
       return this.getNoteById(input.id);
     }

     /**
      * Delete note
      */
     async deleteNote(noteId: string): Promise<void> {
       const note = notesRepository.getNoteById(noteId);
       if (!note) {
         throw new Error(`Note not found: ${noteId}`);
       }

       // Soft delete in database
       notesRepository.deleteNote(noteId);

       // Delete file
       fileManager.deleteNote(note.file_path);
     }

     /**
      * Search notes by title
      */
     async searchNotes(query: string): Promise<NoteWithContent[]> {
       const notes = notesRepository.searchNotesByTitle(query);

       return notes.map((note) => {
         try {
           const { content } = fileManager.readNote(note.file_path);
           const tags = tagsRepository.getTagsForNote(note.id);

           return {
             ...note,
             content,
             tags,
           };
         } catch (error) {
           console.error(`Error reading note ${note.id}:`, error);
           return {
             ...note,
             content: '',
             tags: [],
           };
         }
       });
     }

     /**
      * Helper: Count words in text
      */
     private countWords(text: string): number {
       return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
     }
   }

   // Singleton instance
   export const notesService = new NotesService();
   ```

**Success Criteria**:
- Orchestrates database and file operations
- Creates notes with both metadata and content
- Updates notes atomically
- Handles errors gracefully (missing files, etc.)
- Calculates word and character counts

**Potential Issues**:
- File/database sync issues: If file write fails, database still has record
- Solution: Add transaction support in future (rollback on failure)

---

### Task 1.9: Create IPC Handlers for Notes Operations
**File(s)**:
- `src/ipc/notesHandlers.ts` (new)
- `src/main.ts` (modified)

**Estimated Time**: 35 minutes

**Actions**:
1. Create `src/ipc/` directory:
   ```bash
   mkdir -p src/ipc
   ```

2. Create `src/ipc/notesHandlers.ts`:
   ```typescript
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
   ```

3. Update `src/main.ts` to register handlers:
   ```typescript
   import { registerNotesHandlers } from './ipc/notesHandlers';

   app.on('ready', () => {
     try {
       initializeDatabase();
       runMigrations();
       registerNotesHandlers(); // Add this line
       createWindow();
     } catch (error) {
       console.error('Failed to initialize application:', error);
       app.quit();
     }
   });
   ```

**Success Criteria**:
- IPC handlers registered for all CRUD operations
- Handlers use `ipcMain.handle()` for async operations
- Errors logged and propagated to renderer
- All handlers registered on app ready

**Potential Issues**:
- Handler name conflicts: Ensure unique channel names
- Unhandled errors: All handlers have try/catch blocks

---

### Task 1.10: Update Preload Script with Typed API
**File(s)**:
- `src/preload.ts` (modified)
- `src/preload.d.ts` (modified)

**Estimated Time**: 30 minutes

**Actions**:
1. Update `src/preload.ts`:
   ```typescript
   import { contextBridge, ipcRenderer } from 'electron';
   import { CreateNoteInput, UpdateNoteInput, NoteWithContent } from './database/schema';

   // Expose protected methods that allow the renderer process to use
   // ipcRenderer without exposing the entire object
   contextBridge.exposeInMainWorld('electronAPI', {
     // Notes operations
     notes: {
       create: (input: CreateNoteInput): Promise<NoteWithContent> =>
         ipcRenderer.invoke('notes:create', input),

       getById: (noteId: string): Promise<NoteWithContent | null> =>
         ipcRenderer.invoke('notes:getById', noteId),

       getAll: (): Promise<NoteWithContent[]> => ipcRenderer.invoke('notes:getAll'),

       update: (input: UpdateNoteInput): Promise<NoteWithContent | null> =>
         ipcRenderer.invoke('notes:update', input),

       delete: (noteId: string): Promise<void> => ipcRenderer.invoke('notes:delete', noteId),

       search: (query: string): Promise<NoteWithContent[]> =>
         ipcRenderer.invoke('notes:search', query),

       getAllTags: (): Promise<string[]> => ipcRenderer.invoke('notes:getAllTags'),
     },
   });
   ```

2. Update `src/preload.d.ts`:
   ```typescript
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
   ```

**Success Criteria**:
- Renderer can call `window.electronAPI.notes.*` methods
- All methods have TypeScript types
- Promise-based async API
- Type safety enforced at compile time

**Potential Issues**:
- Import errors: Ensure database/schema types are exported
- Type resolution: May need to update tsconfig.json paths

---

### Task 1.11: Create Simple Test UI for CRUD Operations
**File(s)**:
- `src/renderer/TestNotes.svelte` (new)
- `src/renderer/App.svelte` (modified)

**Estimated Time**: 35 minutes

**Actions**:
1. Create `src/renderer/TestNotes.svelte`:
   ```svelte
   <script lang="ts">
     import { onMount } from 'svelte';
     import type { NoteWithContent } from '../database/schema';

     let notes: NoteWithContent[] = [];
     let selectedNote: NoteWithContent | null = null;
     let newTitle = '';
     let newContent = '';
     let newTags = '';

     async function loadNotes() {
       notes = await window.electronAPI.notes.getAll();
       console.log('Loaded notes:', notes);
     }

     async function createNote() {
       if (!newTitle) {
         alert('Title is required');
         return;
       }

       const tags = newTags
         .split(',')
         .map((t) => t.trim())
         .filter((t) => t.length > 0);

       const note = await window.electronAPI.notes.create({
         title: newTitle,
         content: newContent,
         tags,
       });

       console.log('Created note:', note);
       newTitle = '';
       newContent = '';
       newTags = '';
       await loadNotes();
     }

     async function selectNote(note: NoteWithContent) {
       selectedNote = note;
     }

     async function deleteNote(noteId: string) {
       if (confirm('Delete this note?')) {
         await window.electronAPI.notes.delete(noteId);
         selectedNote = null;
         await loadNotes();
       }
     }

     onMount(() => {
       loadNotes();
     });
   </script>

   <div class="container">
     <div class="sidebar">
       <h2>Notes ({notes.length})</h2>
       <div class="note-list">
         {#each notes as note (note.id)}
           <div
             class="note-item"
             class:selected={selectedNote?.id === note.id}
             on:click={() => selectNote(note)}
           >
             <div class="note-title">{note.title}</div>
             <div class="note-meta">
               {new Date(note.modified_at).toLocaleDateString()}
             </div>
             {#if note.tags.length > 0}
               <div class="note-tags">
                 {#each note.tags as tag}
                   <span class="tag">{tag}</span>
                 {/each}
               </div>
             {/if}
           </div>
         {/each}
       </div>
     </div>

     <div class="main">
       <div class="create-form">
         <h2>Create Note</h2>
         <input type="text" bind:value={newTitle} placeholder="Title" />
         <textarea bind:value={newContent} placeholder="Content" rows="4" />
         <input type="text" bind:value={newTags} placeholder="Tags (comma-separated)" />
         <button on:click={createNote}>Create Note</button>
       </div>

       {#if selectedNote}
         <div class="note-detail">
           <div class="note-header">
             <h2>{selectedNote.title}</h2>
             <button on:click={() => deleteNote(selectedNote.id)}>Delete</button>
           </div>
           <div class="note-content">{selectedNote.content}</div>
           <div class="note-stats">
             <p>Words: {selectedNote.word_count}</p>
             <p>Characters: {selectedNote.character_count}</p>
             <p>Created: {new Date(selectedNote.created_at).toLocaleString()}</p>
             <p>Modified: {new Date(selectedNote.modified_at).toLocaleString()}</p>
           </div>
         </div>
       {/if}
     </div>
   </div>

   <style>
     .container {
       display: flex;
       height: 100vh;
       font-family: system-ui, -apple-system, sans-serif;
     }

     .sidebar {
       width: 300px;
       border-right: 1px solid #ccc;
       padding: 1rem;
       overflow-y: auto;
     }

     .note-list {
       margin-top: 1rem;
     }

     .note-item {
       padding: 0.75rem;
       margin-bottom: 0.5rem;
       border: 1px solid #ddd;
       border-radius: 4px;
       cursor: pointer;
     }

     .note-item:hover {
       background: #f5f5f5;
     }

     .note-item.selected {
       background: #e3f2fd;
       border-color: #2196f3;
     }

     .note-title {
       font-weight: 600;
       margin-bottom: 0.25rem;
     }

     .note-meta {
       font-size: 0.85rem;
       color: #666;
     }

     .note-tags {
       margin-top: 0.5rem;
       display: flex;
       gap: 0.25rem;
       flex-wrap: wrap;
     }

     .tag {
       background: #e0e0e0;
       padding: 0.125rem 0.5rem;
       border-radius: 12px;
       font-size: 0.75rem;
     }

     .main {
       flex: 1;
       padding: 1rem;
       overflow-y: auto;
     }

     .create-form {
       margin-bottom: 2rem;
       padding: 1rem;
       border: 1px solid #ddd;
       border-radius: 4px;
     }

     .create-form input,
     .create-form textarea {
       width: 100%;
       padding: 0.5rem;
       margin-bottom: 0.5rem;
       border: 1px solid #ddd;
       border-radius: 4px;
     }

     .create-form button {
       padding: 0.5rem 1rem;
       background: #2196f3;
       color: white;
       border: none;
       border-radius: 4px;
       cursor: pointer;
     }

     .note-detail {
       padding: 1rem;
       border: 1px solid #ddd;
       border-radius: 4px;
     }

     .note-header {
       display: flex;
       justify-content: space-between;
       align-items: center;
       margin-bottom: 1rem;
     }

     .note-header button {
       padding: 0.5rem 1rem;
       background: #f44336;
       color: white;
       border: none;
       border-radius: 4px;
       cursor: pointer;
     }

     .note-content {
       white-space: pre-wrap;
       margin-bottom: 1rem;
       padding: 1rem;
       background: #f9f9f9;
       border-radius: 4px;
     }

     .note-stats p {
       margin: 0.25rem 0;
       font-size: 0.9rem;
       color: #666;
     }
   </style>
   ```

2. Update `src/renderer/App.svelte`:
   ```svelte
   <script lang="ts">
     import TestNotes from './TestNotes.svelte';
   </script>

   <TestNotes />
   ```

**Success Criteria**:
- UI displays list of notes
- Can create new notes with title, content, and tags
- Can select and view note details
- Can delete notes
- Word/character counts displayed correctly

**Potential Issues**:
- TypeScript errors: Ensure types are imported correctly
- IPC not working: Check console for errors

---

### Task 1.12: Add Error Handling and Logging
**File(s)**:
- `src/utils/logger.ts` (new)
- `src/services/notesService.ts` (modified)

**Estimated Time**: 25 minutes

**Actions**:
1. Create `src/utils/` directory and `logger.ts`:
   ```bash
   mkdir -p src/utils
   ```

   ```typescript
   export enum LogLevel {
     DEBUG = 'DEBUG',
     INFO = 'INFO',
     WARN = 'WARN',
     ERROR = 'ERROR',
   }

   export class Logger {
     private context: string;

     constructor(context: string) {
       this.context = context;
     }

     debug(message: string, ...args: any[]): void {
       this.log(LogLevel.DEBUG, message, ...args);
     }

     info(message: string, ...args: any[]): void {
       this.log(LogLevel.INFO, message, ...args);
     }

     warn(message: string, ...args: any[]): void {
       this.log(LogLevel.WARN, message, ...args);
     }

     error(message: string, error?: Error, ...args: any[]): void {
       this.log(LogLevel.ERROR, message, error, ...args);
     }

     private log(level: LogLevel, message: string, ...args: any[]): void {
       const timestamp = new Date().toISOString();
       const prefix = `[${timestamp}] [${level}] [${this.context}]`;

       switch (level) {
         case LogLevel.DEBUG:
         case LogLevel.INFO:
           console.log(prefix, message, ...args);
           break;
         case LogLevel.WARN:
           console.warn(prefix, message, ...args);
           break;
         case LogLevel.ERROR:
           console.error(prefix, message, ...args);
           break;
       }
     }
   }

   export function createLogger(context: string): Logger {
     return new Logger(context);
   }
   ```

2. Update `src/services/notesService.ts` to use logger:
   ```typescript
   import { createLogger } from '../utils/logger';

   const logger = createLogger('NotesService');

   // In createNote method:
   logger.info('Creating note:', { title: input.title, tags: input.tags });

   // In error cases:
   logger.error('Failed to create note', error);
   ```

**Success Criteria**:
- Logger logs with timestamps and context
- Different log levels (debug, info, warn, error)
- Services use logger instead of console.log
- Errors include stack traces

**Potential Issues**: None expected

---

### Task 1.13: Add Data Validation
**File(s)**:
- `src/utils/validation.ts` (new)
- `src/services/notesService.ts` (modified)

**Estimated Time**: 25 minutes

**Actions**:
1. Create `src/utils/validation.ts`:
   ```typescript
   export class ValidationError extends Error {
     constructor(message: string) {
       super(message);
       this.name = 'ValidationError';
     }
   }

   export function validateNoteTitle(title: string): void {
     if (!title || title.trim().length === 0) {
       throw new ValidationError('Note title is required');
     }

     if (title.length > 255) {
       throw new ValidationError('Note title must be less than 255 characters');
     }
   }

   export function validateNoteContent(content: string): void {
     if (content.length > 1000000) {
       throw new ValidationError('Note content must be less than 1MB');
     }
   }

   export function validateTags(tags: string[]): void {
     if (tags.length > 50) {
       throw new ValidationError('Maximum 50 tags allowed per note');
     }

     for (const tag of tags) {
       if (tag.length > 50) {
         throw new ValidationError('Tag names must be less than 50 characters');
       }
     }
   }
   ```

2. Update `src/services/notesService.ts` to validate inputs:
   ```typescript
   import { validateNoteTitle, validateNoteContent, validateTags } from '../utils/validation';

   // In createNote method:
   validateNoteTitle(input.title);
   validateNoteContent(input.content || '');
   if (input.tags) {
     validateTags(input.tags);
   }
   ```

**Success Criteria**:
- Validates note title, content, and tags
- Throws descriptive validation errors
- Errors propagate to renderer via IPC

**Potential Issues**:
- Validation errors not caught: Ensure IPC handlers catch ValidationError

---

### Task 1.14: Test Complete CRUD Flow
**File(s)**: None (manual testing)
**Estimated Time**: 30 minutes

**Actions**:
1. Start the application: `npm start`
2. Test note creation:
   - Create note with title "Test Note 1"
   - Add content and tags
   - Verify note appears in list
3. Test note reading:
   - Select note from list
   - Verify content displays correctly
   - Check word/character counts
4. Test note updates (if implemented in UI):
   - Modify note content
   - Verify changes saved
5. Test note deletion:
   - Delete a note
   - Verify it's removed from list
   - Check file is deleted from disk
6. Test tags:
   - Create notes with various tags
   - Verify tags display correctly
7. Test persistence:
   - Close and reopen app
   - Verify notes persist
8. Check database:
   - Open SQLite database file (use DB Browser for SQLite)
   - Verify tables and data structure
9. Check file system:
   - Navigate to notes directory
   - Verify Markdown files with frontmatter
10. Test error handling:
    - Try creating note with empty title
    - Verify validation error shown

**Success Criteria**:
- All CRUD operations work correctly
- Data persists across app restarts
- Database and files stay in sync
- Validation prevents invalid data
- No console errors during normal operations

**Potential Issues**:
- Database file locked: Close app completely before opening in DB Browser
- Files not syncing: Check file manager write operations

---

### Task 1.15: Create Documentation and Git Commit
**File(s)**:
- `docs/PHASE_1_NOTES.md` (new)
- `README.md` (modified)

**Estimated Time**: 20 minutes

**Actions**:
1. Create `docs/` directory and `PHASE_1_NOTES.md`:
   ```bash
   mkdir -p docs
   ```

   ```markdown
   # Phase 1: Data Layer Implementation Notes

   ## Completed Components

   ### Database Layer
   - SQLite database with better-sqlite3
   - WAL mode enabled for performance
   - Schema: notes, tags, note_tags tables
   - Proper indexes and foreign keys

   ### Repositories
   - NotesRepository: CRUD operations for notes metadata
   - TagsRepository: Tag management with normalization

   ### Storage
   - FileManager: Markdown file I/O with YAML frontmatter
   - Notes stored in user data directory

   ### Services
   - NotesService: Orchestrates database and file operations
   - Atomic operations for data consistency

   ### IPC Layer
   - Typed API exposed to renderer
   - All CRUD operations available
   - Error handling and logging

   ## Database Location
   - macOS: `~/Library/Application Support/radiant/radiant.db`
   - Windows: `%APPDATA%/radiant/radiant.db`
   - Linux: `~/.config/radiant/radiant.db`

   ## Notes Directory
   - Same as database location, in `notes/` subdirectory

   ## API Usage (Renderer)

   \`\`\`typescript
   // Create note
   const note = await window.electronAPI.notes.create({
     title: 'My Note',
     content: 'Note content here',
     tags: ['work', 'important']
   });

   // Get all notes
   const notes = await window.electronAPI.notes.getAll();

   // Update note
   await window.electronAPI.notes.update({
     id: noteId,
     content: 'Updated content'
   });

   // Delete note
   await window.electronAPI.notes.delete(noteId);
   \`\`\`

   ## Next Steps (Phase 2)
   - Build proper UI components
   - Integrate TipTap editor
   - Add search UI
   ```

2. Update `README.md`:
   ```markdown
   ## Progress

   - [x] Phase 0: Environment Setup
   - [x] Phase 1: Data Layer and CRUD Operations
   - [ ] Phase 2: UI and Editor Integration
   ```

3. Create git commit:
   ```bash
   git add .
   git commit -m "feat: implement data layer with SQLite and file storage

   Phase 1 complete:
   - SQLite database with better-sqlite3
   - Database schema (notes, tags, note_tags)
   - WAL mode and performance optimizations
   - CRUD operations for notes
   - File-based Markdown storage with YAML frontmatter
   - IPC handlers for all operations
   - Typed API in preload script
   - Error handling and validation
   - Basic test UI for verification

   Notes are stored as:
   - Metadata in SQLite database
   - Content in Markdown files with frontmatter
   - Both in user data directory

   Ready for Phase 2 (UI and editor integration)"
   ```

**Success Criteria**:
- Documentation explains data layer architecture
- README updated with phase completion
- Git commit with clear description
- All changes committed

**Potential Issues**: None expected

---

## Integration Points

### From Phase 0:
- **IPC Bridge**: Extended with notes-specific handlers
- **Main Process**: Database initialized before window creation
- **Preload Script**: Extended with notes API

### For Phase 2 (UI and Editor):
- **Notes API**: Phase 2 will consume `window.electronAPI.notes.*`
- **Data Structure**: UI will work with `NoteWithContent` type
- **File Paths**: Editor will not directly access files (uses IPC)

### Expected Exports from Phase 1:
- Complete CRUD API for notes
- Database with optimized queries
- File system storage for note content
- Tag management system
- Validation and error handling

---

## Testing Strategy

### Manual Testing Checklist:
- [ ] Create note with title, content, and tags
- [ ] Note appears in list immediately
- [ ] Select note and view details
- [ ] Word count and character count are accurate
- [ ] Update note content
- [ ] Delete note
- [ ] Close app and reopen - notes persist
- [ ] Check database file with DB Browser for SQLite
- [ ] Check notes directory - verify .md files exist
- [ ] Open .md file - verify YAML frontmatter
- [ ] Create note with empty title - validation error shown
- [ ] Create note with very long title - validation error shown
- [ ] Test with 100+ notes - no performance issues

### Database Verification:
```sql
-- Check notes table
SELECT * FROM notes;

-- Check tags table
SELECT * FROM tags;

-- Check note-tag relationships
SELECT n.title, t.name
FROM notes n
JOIN note_tags nt ON n.id = nt.note_id
JOIN tags t ON nt.tag_id = t.id;

-- Verify indexes
SELECT name FROM sqlite_master WHERE type='index';
```

### File System Verification:
- Navigate to user data directory
- Open `notes/` folder
- Open a `.md` file
- Verify frontmatter format:
  ```yaml
  ---
  title: My Note
  tags:
    - work
    - important
  created_at: 1234567890
  modified_at: 1234567890
  ---

  Note content here...
  ```

---

## Potential Issues and Solutions

### Issue 1: SQLite "database is locked" error
**Cause**: WAL mode not enabled or concurrent access issues
**Solution**:
- Verify `db.pragma('journal_mode = WAL')` runs successfully
- Check busy_timeout is set: `db.pragma('busy_timeout = 5000')`
- Ensure database is closed properly on app quit

### Issue 2: File not found when reading note
**Cause**: File deleted or moved manually
**Solution**:
- Add error handling in `FileManager.readNote()`
- Return empty content and log warning
- Optional: Add database/file sync repair tool

### Issue 3: Tags not appearing for notes
**Cause**: Transaction not committed or junction table not populated
**Solution**:
- Check `setTagsForNote()` runs in transaction
- Verify note_tags table has entries: `SELECT * FROM note_tags`

### Issue 4: Word count is 0
**Cause**: Content not passed to update method
**Solution**:
- Ensure `countWords()` is called in `createNote()` and `updateNote()`
- Verify content is not empty string

### Issue 5: Validation errors not shown in UI
**Cause**: Errors not caught in renderer
**Solution**:
```typescript
try {
  await window.electronAPI.notes.create(input);
} catch (error) {
  alert(error.message);
}
```

### Issue 6: Notes directory not created
**Cause**: User data directory path incorrect
**Solution**:
- Log `CONFIG.NOTES_DIR` value
- Verify `app.getPath('userData')` returns valid path
- Check directory creation in `ensureNotesDirectory()`

### Issue 7: Native module compilation fails
**Cause**: Build tools not installed (better-sqlite3 is native)
**Solution**:
- macOS: `xcode-select --install`
- Windows: `npm install --global windows-build-tools`
- Linux: `sudo apt-get install build-essential`

---

## Success Criteria

### Phase 1 Complete When:
1. ✅ SQLite database initialized with proper schema
2. ✅ WAL mode enabled and verified
3. ✅ Can create notes with metadata and content
4. ✅ Notes stored in both database and file system
5. ✅ Can read, update, delete notes
6. ✅ Tags work correctly with many-to-many relationships
7. ✅ IPC API fully functional from renderer
8. ✅ Validation prevents invalid data
9. ✅ Errors handled gracefully
10. ✅ Data persists across app restarts
11. ✅ Test UI demonstrates all operations

### Deliverables:
- ✅ Functioning database layer with better-sqlite3
- ✅ File system integration for Markdown storage
- ✅ Complete CRUD operations
- ✅ IPC API exposed to renderer
- ✅ Type-safe API with TypeScript
- ✅ Error handling and logging
- ✅ Validation system
- ✅ Documentation

---

## Next Steps After Phase 1

Once Phase 1 is complete and verified:

1. **Review Data Flow**: Understand the complete data flow:
   - Renderer calls `window.electronAPI.notes.*`
   - Preload forwards to IPC handler
   - Handler calls NotesService
   - Service orchestrates database and file operations
   - Response flows back to renderer

2. **Prepare for Phase 2**:
   - Review TipTap documentation
   - Understand Svelte component structure
   - Plan UI/UX for note-taking interface

3. **Optional: Add More Test Data**:
   ```typescript
   // Create sample notes for testing UI
   for (let i = 1; i <= 20; i++) {
     await window.electronAPI.notes.create({
       title: `Sample Note ${i}`,
       content: `This is sample content for note ${i}.\n\nIt has multiple paragraphs.`,
       tags: [`tag${i % 3}`, `category${i % 5}`]
     });
   }
   ```

4. **Create Phase 2 Branch**:
   ```bash
   git checkout -b phase-2-ui-editor
   ```

---

## Notes for Junior Developers

### Key Concepts to Understand:

1. **Dual Storage Architecture**:
   - Metadata in database (fast queries, relationships)
   - Content in files (human-readable, portable)
   - Both must stay in sync

2. **Repository Pattern**:
   - Repositories handle database operations
   - Services orchestrate multiple repositories
   - Separation of concerns

3. **YAML Frontmatter**:
   - Metadata at top of Markdown file
   - Delimited by `---`
   - Parsed by gray-matter library

4. **SQLite Pragmas**:
   - WAL mode: Write-Ahead Logging for better concurrency
   - Foreign keys: Enforce referential integrity
   - Indexes: Speed up queries

5. **IPC with invoke/handle**:
   - `ipcMain.handle()`: For async operations returning values
   - `ipcRenderer.invoke()`: Call from renderer, get Promise
   - Better than send/on for request-response patterns

### Common Mistakes to Avoid:
- ❌ Not enabling foreign keys (data integrity issues)
- ❌ Forgetting to close database on app quit
- ❌ Writing to files synchronously in loops (performance)
- ❌ Not validating user input
- ❌ Hardcoding file paths (use CONFIG)
- ❌ Not handling errors in async operations

### Debugging Tips:
- Use DB Browser for SQLite to inspect database
- Check user data directory for .md files
- Add console.log in IPC handlers to trace flow
- Open DevTools in renderer to see errors
- Check main process console for backend errors

### Resources:
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- gray-matter: https://github.com/jonschlinkert/gray-matter
- Electron IPC: https://www.electronjs.org/docs/latest/tutorial/ipc
- SQLite WAL: https://www.sqlite.org/wal.html
