import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { CONFIG } from '../config';
import { createLogger } from '../utils/logger';
import type { NoteFrontmatter } from '../types';
import {
  validateNoteId,
  validateFilePath,
  validateNoteContent,
  ValidationError,
} from '../utils/validation';

const logger = createLogger('FileManager');

/**
 * Error codes for file system operations
 */
export enum FileSystemErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  INVALID_PATH = 'INVALID_PATH',
  ENCODING_ERROR = 'ENCODING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  MKDIR_FAILED = 'MKDIR_FAILED',
}

/**
 * Custom error class for file system operations
 */
export class FileSystemError extends Error {
  constructor(
    public code: FileSystemErrorCode,
    public filePath: string,
    public originalError?: Error
  ) {
    super(FileSystemError.formatMessage(code, filePath, originalError));
    this.name = 'FileSystemError';
    Error.captureStackTrace(this, FileSystemError);
  }

  private static formatMessage(
    code: FileSystemErrorCode,
    filePath: string,
    originalError?: Error
  ): string {
    const messages: Record<FileSystemErrorCode, string> = {
      [FileSystemErrorCode.PERMISSION_DENIED]: `Permission denied: Cannot access file at "${filePath}". Please check file permissions.`,
      [FileSystemErrorCode.DISK_FULL]: `Disk full: Cannot write to "${filePath}". Please free up disk space.`,
      [FileSystemErrorCode.FILE_NOT_FOUND]: `File not found: The file at "${filePath}" does not exist.`,
      [FileSystemErrorCode.DIRECTORY_NOT_FOUND]: `Directory not found: The directory containing "${filePath}" does not exist.`,
      [FileSystemErrorCode.INVALID_PATH]: `Invalid path: The path "${filePath}" is not valid.`,
      [FileSystemErrorCode.ENCODING_ERROR]: `Encoding error: Cannot read file at "${filePath}". The file may be corrupted or in an unsupported format.`,
      [FileSystemErrorCode.UNKNOWN_ERROR]: `Unknown error: An unexpected error occurred while accessing "${filePath}".`,
      [FileSystemErrorCode.MKDIR_FAILED]: `Directory creation failed: Cannot create directory at "${filePath}".`,
    };

    const baseMessage =
      messages[code] || messages[FileSystemErrorCode.UNKNOWN_ERROR];
    const details = originalError ? ` Details: ${originalError.message}` : '';
    return `${baseMessage}${details}`;
  }

  /**
   * Map Node.js error codes to FileSystemErrorCode
   */
  static mapNodeError(error: NodeJS.ErrnoException): FileSystemErrorCode {
    switch (error.code) {
      case 'EACCES':
      case 'EPERM':
        return FileSystemErrorCode.PERMISSION_DENIED;
      case 'ENOSPC':
        return FileSystemErrorCode.DISK_FULL;
      case 'ENOENT':
        return FileSystemErrorCode.FILE_NOT_FOUND;
      case 'ENOTDIR':
        return FileSystemErrorCode.DIRECTORY_NOT_FOUND;
      case 'EINVAL':
        return FileSystemErrorCode.INVALID_PATH;
      default:
        return FileSystemErrorCode.UNKNOWN_ERROR;
    }
  }
}

export class FileManager {
  private notesDir: string | null = null;
  private customNotesDir?: string;
  private initialized = false;

  constructor(notesDir?: string) {
    this.customNotesDir = notesDir;
  }

  private getNotesDir(): string {
    if (!this.notesDir) {
      this.notesDir = this.customNotesDir || CONFIG.NOTES_DIR;
    }
    return this.notesDir;
  }

  private ensureNotesDirectory(): void {
    if (!this.initialized) {
      const dir = this.getNotesDir();
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          logger.info(`Created notes directory: ${dir}`);
        }
        this.initialized = true;
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        const errorCode = FileSystemError.mapNodeError(nodeError);
        logger.error(`Failed to create notes directory: ${dir}`, error);
        throw new FileSystemError(
          errorCode === FileSystemErrorCode.UNKNOWN_ERROR
            ? FileSystemErrorCode.MKDIR_FAILED
            : errorCode,
          dir,
          nodeError
        );
      }
    }
  }

  /**
   * Generate a file path for a note
   */
  generateFilePath(noteId: string): string {
    // Validate note ID to prevent path traversal
    validateNoteId(noteId);

    this.ensureNotesDirectory();
    const filePath = path.join(this.getNotesDir(), `${noteId}.md`);

    // Validate the generated path
    validateFilePath(filePath, this.getNotesDir());

    return filePath;
  }

  /**
   * Write note content to file with frontmatter
   */
  writeNote(
    filePath: string,
    content: string,
    frontmatter: NoteFrontmatter
  ): void {
    this.ensureNotesDirectory();

    try {
      // Validate inputs
      validateFilePath(filePath, this.getNotesDir());
      validateNoteContent(content);

      // Validate frontmatter
      if (!frontmatter || typeof frontmatter !== 'object') {
        throw new ValidationError('Frontmatter must be a valid object');
      }

      if (typeof frontmatter.title !== 'string' || !frontmatter.title.trim()) {
        throw new ValidationError('Frontmatter must include a valid title');
      }

      if (!Array.isArray(frontmatter.tags)) {
        throw new ValidationError('Frontmatter tags must be an array');
      }

      if (
        typeof frontmatter.created_at !== 'number' ||
        frontmatter.created_at < 0
      ) {
        throw new ValidationError(
          'Frontmatter must include a valid created_at timestamp'
        );
      }

      if (
        typeof frontmatter.modified_at !== 'number' ||
        frontmatter.modified_at < 0
      ) {
        throw new ValidationError(
          'Frontmatter must include a valid modified_at timestamp'
        );
      }

      const fileContent = matter.stringify(content, frontmatter);
      fs.writeFileSync(filePath, fileContent, 'utf-8');
      logger.info(`Note written to: ${filePath}`);
    } catch (error) {
      // If it's already a FileSystemError or ValidationError, re-throw it
      if (
        error instanceof FileSystemError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      const nodeError = error as NodeJS.ErrnoException;
      const errorCode = FileSystemError.mapNodeError(nodeError);
      logger.error(`Failed to write note: ${filePath}`, error);
      throw new FileSystemError(errorCode, filePath, nodeError);
    }
  }

  /**
   * Read note content from file
   */
  readNote(filePath: string): {
    content: string;
    frontmatter: NoteFrontmatter;
  } {
    try {
      // Validate file path
      validateFilePath(filePath, this.getNotesDir());

      if (!fs.existsSync(filePath)) {
        throw new FileSystemError(FileSystemErrorCode.FILE_NOT_FOUND, filePath);
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsed = matter(fileContent);

      return {
        content: parsed.content,
        frontmatter: parsed.data as NoteFrontmatter,
      };
    } catch (error) {
      // If it's already a FileSystemError or ValidationError, re-throw it
      if (
        error instanceof FileSystemError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      const nodeError = error as NodeJS.ErrnoException;
      let errorCode = FileSystemError.mapNodeError(nodeError);

      // Check if it's an encoding error
      if (
        nodeError.message &&
        (nodeError.message.includes('encoding') ||
          nodeError.message.includes('decode') ||
          nodeError.message.includes('invalid'))
      ) {
        errorCode = FileSystemErrorCode.ENCODING_ERROR;
      }

      logger.error(`Failed to read note: ${filePath}`, error);
      throw new FileSystemError(errorCode, filePath, nodeError);
    }
  }

  /**
   * Delete note file
   */
  deleteNote(filePath: string): void {
    try {
      // Validate file path
      validateFilePath(filePath, this.getNotesDir());

      if (!fs.existsSync(filePath)) {
        throw new FileSystemError(FileSystemErrorCode.FILE_NOT_FOUND, filePath);
      }

      fs.unlinkSync(filePath);
      logger.info(`Note deleted: ${filePath}`);
    } catch (error) {
      // If it's already a FileSystemError or ValidationError, re-throw it
      if (
        error instanceof FileSystemError ||
        error instanceof ValidationError
      ) {
        throw error;
      }

      const nodeError = error as NodeJS.ErrnoException;
      const errorCode = FileSystemError.mapNodeError(nodeError);
      logger.error(`Failed to delete note: ${filePath}`, error);
      throw new FileSystemError(errorCode, filePath, nodeError);
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
    this.ensureNotesDirectory();
    const dir = this.getNotesDir();

    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => path.join(dir, file));
  }
}

// Singleton instance
export const fileManager = new FileManager();
