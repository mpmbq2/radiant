import { v4 as uuidv4 } from 'uuid';
import type { NotesRepository } from '../database/notesRepository';
import type { TagsRepository } from '../database/tagsRepository';
import { getNotesRepository } from '../database/notesRepository';
import { getTagsRepository } from '../database/tagsRepository';
import { fileManager } from '../storage/fileManager';
import type {
  Note,
  NoteWithContent,
  CreateNoteInput,
  UpdateNoteInput,
} from '../types';
import { createLogger } from '../utils/logger';
import {
  validateNoteTitle,
  validateNoteContent,
  validateTags,
  sanitizeNoteTitle,
  sanitizeTagName,
} from '../utils/validation';
import { getSearchService } from './searchService';

const logger = createLogger('NotesService');

export class NotesService {
  private notesRepo: NotesRepository;
  private tagsRepo: TagsRepository;

  constructor(notesRepo: NotesRepository, tagsRepo: TagsRepository) {
    this.notesRepo = notesRepo;
    this.tagsRepo = tagsRepo;
  }

  /**
   * Initialize the search index with all existing notes
   * Should be called once at application startup
   */
  async initializeSearch(): Promise<void> {
    try {
      logger.info('Initializing search index...');
      const searchService = getSearchService();
      const notes = await this.getAllNotes();
      await searchService.indexNotes(notes);
      logger.info('Search index initialized successfully', {
        noteCount: notes.length,
      });
    } catch (error) {
      logger.error('Failed to initialize search index', error);
      throw error;
    }
  }

  /**
   * Create a new note (database + file)
   */
  async createNote(input: CreateNoteInput): Promise<NoteWithContent> {
    logger.info('Creating note', { title: input.title, tags: input.tags });

    // Sanitize inputs first to prevent duplicate-looking entries
    const sanitizedTitle = sanitizeNoteTitle(input.title);
    const sanitizedTags = input.tags
      ? input.tags.map(sanitizeTagName).filter((tag) => tag.length > 0)
      : [];

    // Validate sanitized inputs
    validateNoteTitle(sanitizedTitle);
    validateNoteContent(input.content || '');
    if (sanitizedTags.length > 0) {
      validateTags(sanitizedTags);
    }

    const noteId = uuidv4();
    const filePath = fileManager.generateFilePath(noteId);
    const now = Date.now();

    // Create database record with sanitized title
    const note = this.notesRepo.createNote(noteId, sanitizedTitle, filePath);

    // Write file with sanitized data
    fileManager.writeNote(filePath, input.content || '', {
      title: sanitizedTitle,
      tags: sanitizedTags,
      created_at: now,
      modified_at: now,
    });

    // Set tags if provided (using sanitized tags)
    if (sanitizedTags.length > 0) {
      await this.tagsRepo.setTagsForNote(noteId, sanitizedTags);
    }

    // Calculate word count
    const wordCount = this.countWords(input.content || '');
    const charCount = (input.content || '').length;

    this.notesRepo.updateNote(noteId, {
      word_count: wordCount,
      character_count: charCount,
    });

    const createdNote = {
      ...note,
      content: input.content || '',
      tags: sanitizedTags,
      word_count: wordCount,
      character_count: charCount,
    };

    // Add to search index
    try {
      const searchService = getSearchService();
      await searchService.addNote(createdNote);
    } catch (error) {
      logger.warn('Failed to add note to search index', error);
      // Don't fail the entire operation if search indexing fails
    }

    return createdNote;
  }

  /**
   * Get note by ID with content
   */
  async getNoteById(noteId: string): Promise<NoteWithContent | null> {
    const note = this.notesRepo.getNoteById(noteId);
    if (!note) {
      return null;
    }

    // Read file content
    const { content } = fileManager.readNote(note.file_path);
    const tags = this.tagsRepo.getTagsForNote(noteId);

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
    const notes = this.notesRepo.getAllNotes();
    const enrichedNotes: NoteWithContent[] = [];

    for (const note of notes) {
      try {
        enrichedNotes.push(this.enrichNoteWithContent(note));
      } catch (error) {
        // Log the error but continue loading other notes
        // This allows partial recovery when individual note files are corrupted
        if (error instanceof Error) {
          logger.warn(
            `Skipping note ${note.id} due to read error: ${error.message}`,
            error
          );
        } else {
          logger.warn(
            `Skipping note ${note.id} due to read error: ${String(error)}`
          );
        }
      }
    }

    return enrichedNotes;
  }

  /**
   * Update note
   */
  async updateNote(input: UpdateNoteInput): Promise<NoteWithContent | null> {
    const note = this.notesRepo.getNoteById(input.id);
    if (!note) {
      return null;
    }

    // Sanitize inputs
    const sanitizedTitle = input.title
      ? sanitizeNoteTitle(input.title)
      : undefined;
    const sanitizedTags = input.tags
      ? input.tags.map(sanitizeTagName).filter((tag) => tag.length > 0)
      : undefined;

    const now = Date.now();
    const updates: {
      title?: string;
      word_count?: number;
      character_count?: number;
    } = {};

    // Update title if provided (using sanitized version)
    if (sanitizedTitle !== undefined) {
      updates.title = sanitizedTitle;
    }

    // Update content if provided
    let content = '';
    if (input.content !== undefined) {
      content = input.content;

      // Read current frontmatter
      const currentFile = fileManager.readNote(note.file_path);

      // Write updated file with sanitized data
      fileManager.writeNote(note.file_path, content, {
        ...currentFile.frontmatter,
        title: sanitizedTitle || note.title,
        modified_at: now,
        tags: sanitizedTags || currentFile.frontmatter.tags,
      });

      // Update word count
      updates.word_count = this.countWords(content);
      updates.character_count = content.length;
    }

    // Update tags if provided (using sanitized tags)
    if (sanitizedTags !== undefined) {
      await this.tagsRepo.setTagsForNote(input.id, sanitizedTags);
    }

    // Update database
    if (Object.keys(updates).length > 0) {
      this.notesRepo.updateNote(input.id, updates);
    }

    // Get updated note
    const updatedNote = await this.getNoteById(input.id);

    // Update search index
    if (updatedNote) {
      try {
        const searchService = getSearchService();
        await searchService.updateNote(updatedNote);
      } catch (error) {
        logger.warn('Failed to update note in search index', error);
        // Don't fail the entire operation if search indexing fails
      }
    }

    return updatedNote;
  }

  /**
   * Delete note
   */
  async deleteNote(noteId: string): Promise<void> {
    const note = this.notesRepo.getNoteById(noteId);
    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }

    // Soft delete in database
    this.notesRepo.deleteNote(noteId);

    // Delete file
    fileManager.deleteNote(note.file_path);

    // Remove from search index
    try {
      const searchService = getSearchService();
      await searchService.removeNote(noteId);
    } catch (error) {
      logger.warn('Failed to remove note from search index', error);
      // Don't fail the entire operation if search indexing fails
    }
  }

  /**
   * Search notes by title
   */
  async searchNotes(query: string): Promise<NoteWithContent[]> {
    const notes = this.notesRepo.searchNotesByTitle(query);
    const enrichedNotes: NoteWithContent[] = [];

    for (const note of notes) {
      try {
        enrichedNotes.push(this.enrichNoteWithContent(note));
      } catch (error) {
        // Log the error but continue loading other notes
        // This allows partial recovery when individual note files are corrupted
        if (error instanceof Error) {
          logger.warn(
            `Skipping note ${note.id} in search results due to read error: ${error.message}`,
            error
          );
        } else {
          logger.warn(
            `Skipping note ${note.id} in search results due to read error: ${String(error)}`
          );
        }
      }
    }

    return enrichedNotes;
  }

  /**
   * Helper: Enrich a note with content and tags from file system
   * Throws if the note file cannot be read - caller must handle the error
   */
  private enrichNoteWithContent(note: Note): NoteWithContent {
    const { content } = fileManager.readNote(note.file_path);
    const tags = this.tagsRepo.getTagsForNote(note.id);

    return {
      ...note,
      content,
      tags,
    };
  }

  /**
   * Helper: Count words in text
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }
}

// Lazy singleton instance
let _instance: NotesService | null = null;

export function getNotesService(): NotesService {
  if (!_instance) {
    _instance = new NotesService(getNotesRepository(), getTagsRepository());
  }
  return _instance;
}
