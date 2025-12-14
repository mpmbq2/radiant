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
