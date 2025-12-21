import { describe, it, expect } from 'vitest';
import {
  validateNoteTitle,
  validateNoteContent,
  validateTags,
  ValidationError,
} from './validation';
import { VALIDATION_LIMITS } from '../config/validation';

describe('validation', () => {
  describe('validateNoteTitle', () => {
    it('should accept valid note titles', () => {
      expect(() => validateNoteTitle('Valid Title')).not.toThrow();
      expect(() => validateNoteTitle('Another Valid Title')).not.toThrow();
      expect(() => validateNoteTitle('T')).not.toThrow();
    });

    it('should reject empty titles', () => {
      expect(() => validateNoteTitle('')).toThrow(ValidationError);
      expect(() => validateNoteTitle('')).toThrow('Note title is required');
    });

    it('should reject whitespace-only titles', () => {
      expect(() => validateNoteTitle('   ')).toThrow(ValidationError);
      expect(() => validateNoteTitle('   ')).toThrow('Note title is required');
    });

    it('should reject titles exceeding maximum length', () => {
      const longTitle = 'a'.repeat(VALIDATION_LIMITS.NOTE_TITLE_MAX_LENGTH + 1);
      expect(() => validateNoteTitle(longTitle)).toThrow(ValidationError);
      expect(() => validateNoteTitle(longTitle)).toThrow('must be less than');
    });

    it('should accept titles at maximum length boundary', () => {
      const maxTitle = 'a'.repeat(VALIDATION_LIMITS.NOTE_TITLE_MAX_LENGTH);
      expect(() => validateNoteTitle(maxTitle)).not.toThrow();
    });
  });

  describe('validateNoteContent', () => {
    it('should accept valid content', () => {
      expect(() => validateNoteContent('')).not.toThrow();
      expect(() => validateNoteContent('Some content')).not.toThrow();
      expect(() => validateNoteContent('A'.repeat(1000))).not.toThrow();
    });

    it('should reject content exceeding maximum length', () => {
      const longContent = 'a'.repeat(
        VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH + 1
      );
      expect(() => validateNoteContent(longContent)).toThrow(ValidationError);
      expect(() => validateNoteContent(longContent)).toThrow(
        'must be less than 1MB'
      );
    });

    it('should accept content at maximum length boundary', () => {
      const maxContent = 'a'.repeat(VALIDATION_LIMITS.NOTE_CONTENT_MAX_LENGTH);
      expect(() => validateNoteContent(maxContent)).not.toThrow();
    });
  });

  describe('validateTags', () => {
    it('should accept valid tag arrays', () => {
      expect(() => validateTags([])).not.toThrow();
      expect(() => validateTags(['tag1'])).not.toThrow();
      expect(() => validateTags(['tag1', 'tag2', 'tag3'])).not.toThrow();
    });

    it('should reject too many tags', () => {
      const tooManyTags = Array(VALIDATION_LIMITS.MAX_TAGS_PER_NOTE + 1).fill(
        'tag'
      );
      expect(() => validateTags(tooManyTags)).toThrow(ValidationError);
      expect(() => validateTags(tooManyTags)).toThrow('Maximum');
    });

    it('should accept maximum number of tags', () => {
      const maxTags = Array(VALIDATION_LIMITS.MAX_TAGS_PER_NOTE).fill('tag');
      expect(() => validateTags(maxTags)).not.toThrow();
    });

    it('should reject tags with names exceeding maximum length', () => {
      const longTag = 'a'.repeat(VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH + 1);
      expect(() => validateTags([longTag])).toThrow(ValidationError);
      expect(() => validateTags([longTag])).toThrow(
        'Tag names must be less than'
      );
    });

    it('should accept tags at maximum name length', () => {
      const maxTag = 'a'.repeat(VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH);
      expect(() => validateTags([maxTag])).not.toThrow();
    });

    it('should reject if any tag in array exceeds length', () => {
      const longTag = 'a'.repeat(VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH + 1);
      expect(() => validateTags(['valid', longTag, 'also-valid'])).toThrow(
        ValidationError
      );
    });
  });

  describe('ValidationError', () => {
    it('should be instanceof Error', () => {
      const error = new ValidationError('test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new ValidationError('test');
      expect(error.name).toBe('ValidationError');
    });

    it('should preserve message', () => {
      const error = new ValidationError('test message');
      expect(error.message).toBe('test message');
    });
  });
});
