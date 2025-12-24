import path from 'path';
import { VALIDATION_LIMITS } from '../config/validation';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate that a value is a non-empty string
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options?: { minLength?: number; maxLength?: number }
): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(
      `${fieldName} must be a string, received ${typeof value}`
    );
  }

  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  if (options?.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${options.minLength} characters`
    );
  }

  if (options?.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} must be less than ${options.maxLength} characters`
    );
  }
}

/**
 * Validate note ID format (UUID v4)
 */
export function validateNoteId(noteId: unknown): asserts noteId is string {
  validateString(noteId, 'Note ID');

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(noteId as string)) {
    throw new ValidationError(
      `Note ID must be a valid UUID v4 format, received: ${noteId}`
    );
  }
}

/**
 * Validate note title
 */
export function validateNoteTitle(title: unknown): asserts title is string {
  if (typeof title !== 'string') {
    throw new ValidationError(
      `Note title must be a string, received ${typeof title}`
    );
  }

  if (!title || title.trim().length === 0) {
    throw new ValidationError('Note title is required');
  }

  if (title.length > VALIDATION_LIMITS.NOTE_TITLE_MAX_LENGTH) {
    throw new ValidationError(
      `Note title must be less than ${VALIDATION_LIMITS.NOTE_TITLE_MAX_LENGTH} characters`
    );
  }
}

/**
 * Validate note content
 */
export function validateNoteContent(
  content: unknown
): asserts content is string {
  if (typeof content !== 'string') {
    throw new ValidationError(
      `Note content must be a string, received ${typeof content}`
    );
  }

  if (content.length > VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH) {
    throw new ValidationError('Note content must be less than 1MB');
  }
}

/**
 * Validate tag name
 */
export function validateTagName(tagName: unknown): asserts tagName is string {
  if (typeof tagName !== 'string') {
    throw new ValidationError(
      `Tag name must be a string, received ${typeof tagName}`
    );
  }

  if (!tagName || tagName.trim().length === 0) {
    throw new ValidationError('Tag name cannot be empty');
  }

  if (tagName.length > VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH) {
    throw new ValidationError(
      `Tag name must be less than ${VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH} characters`
    );
  }

  // Prevent invalid characters in tag names
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(tagName)) {
    throw new ValidationError(
      'Tag name contains invalid characters (cannot use: < > : " / \\ | ? * or control characters)'
    );
  }
}

/**
 * Validate array of tags
 */
export function validateTags(tags: unknown): asserts tags is string[] {
  if (!Array.isArray(tags)) {
    throw new ValidationError(`Tags must be an array, received ${typeof tags}`);
  }

  if (tags.length > VALIDATION_LIMITS.MAX_TAGS_PER_NOTE) {
    throw new ValidationError(
      `Maximum ${VALIDATION_LIMITS.MAX_TAGS_PER_NOTE} tags allowed per note`
    );
  }

  for (const tag of tags) {
    validateTagName(tag);
  }
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string
): asserts value is number {
  if (typeof value !== 'number') {
    throw new ValidationError(
      `${fieldName} must be a number, received ${typeof value}`
    );
  }

  if (isNaN(value)) {
    throw new ValidationError(
      `${fieldName} must be a valid number (received NaN)`
    );
  }

  if (!isFinite(value)) {
    throw new ValidationError(
      `${fieldName} must be a finite number (received ${value})`
    );
  }

  if (value < 0) {
    throw new ValidationError(`${fieldName} must be non-negative`);
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }
}

/**
 * Validate file path for security
 */
export function validateFilePath(
  filePath: unknown,
  notesDir: string
): asserts filePath is string {
  validateString(filePath, 'File path');

  // Must be absolute path
  if (!path.isAbsolute(filePath as string)) {
    throw new ValidationError(
      `File path must be absolute, received: ${filePath}`
    );
  }

  // Normalize both paths for comparison
  const normalizedFilePath = path.normalize(filePath as string);
  const normalizedNotesDir = path.normalize(notesDir);

  // Check for path traversal attacks
  if (!normalizedFilePath.startsWith(normalizedNotesDir)) {
    throw new ValidationError(
      `File path must be within notes directory. Path: ${filePath}, Expected directory: ${notesDir}`
    );
  }

  // Check for invalid characters (mainly for Windows compatibility)
  // eslint-disable-next-line no-control-regex
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  const fileName = path.basename(filePath as string);
  if (invalidChars.test(fileName)) {
    throw new ValidationError(
      `File path contains invalid characters: ${fileName}`
    );
  }

  // Must be a .md file
  if (!normalizedFilePath.endsWith('.md')) {
    throw new ValidationError(
      `File path must have .md extension, received: ${filePath}`
    );
  }
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: unknown): asserts query is string {
  if (typeof query !== 'string') {
    throw new ValidationError(
      `Search query must be a string, received ${typeof query}`
    );
  }

  // Empty queries are allowed for "search all"
  if (query.length > 500) {
    throw new ValidationError('Search query must be less than 500 characters');
  }
}
