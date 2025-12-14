import { v4 as uuidv4 } from 'uuid';
import { notesRepository } from '../database/notesRepository';
import { tagsRepository } from '../database/tagsRepository';
import { fileManager } from '../storage/fileManager';
import { NoteWithContent, CreateNoteInput, UpdateNoteInput } from '../database/schema';
import { createLogger } from '../utils/logger';
import { validateNoteTitle, validateNoteContent, validateTags } from '../utils/validation';

const logger = createLogger('NotesService');

export class NotesService {
  /**
   * Create a new note (database + file)
   */
  async createNote(input: CreateNoteInput): Promise<NoteWithContent> {
    logger.info('Creating note', { title: input.title, tags: input.tags });

    // Validate inputs
    validateNoteTitle(input.title);
    validateNoteContent(input.content || '');
    if (input.tags) {
      validateTags(input.tags);
    }

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
