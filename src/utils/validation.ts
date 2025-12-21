import { VALIDATION_LIMITS } from '../config/validation';

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

  if (title.length > VALIDATION_LIMITS.NOTE_TITLE_MAX_LENGTH) {
    throw new ValidationError(
      `Note title must be less than ${VALIDATION_LIMITS.NOTE_TITLE_MAX_LENGTH} characters`
    );
  }
}

export function validateNoteContent(content: string): void {
  if (content.length > VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH) {
    throw new ValidationError('Note content must be less than 1MB');
  }
}

export function validateTags(tags: string[]): void {
  if (tags.length > VALIDATION_LIMITS.MAX_TAGS_PER_NOTE) {
    throw new ValidationError(
      `Maximum ${VALIDATION_LIMITS.MAX_TAGS_PER_NOTE} tags allowed per note`
    );
  }

  for (const tag of tags) {
    if (tag.length > VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH) {
      throw new ValidationError(
        `Tag names must be less than ${VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH} characters`
      );
    }
  }
}
