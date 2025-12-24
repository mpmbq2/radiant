import { describe, it, expect } from 'vitest';
import {
  validateNoteTitle,
  validateNoteContent,
  validateTags,
  validateNoteId,
  validateTagName,
  validateString,
  validatePositiveNumber,
  validateFilePath,
  validateSearchQuery,
  ValidationError,
  sanitizeNoteTitle,
  sanitizeTagName,
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
        'Tag name must be less than'
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

  describe('validateString', () => {
    it('should accept valid strings', () => {
      expect(() => validateString('valid', 'Test')).not.toThrow();
      expect(() => validateString('another valid', 'Test')).not.toThrow();
    });

    it('should reject non-strings', () => {
      expect(() => validateString(123, 'Test')).toThrow(ValidationError);
      expect(() => validateString(null, 'Test')).toThrow(ValidationError);
      expect(() => validateString(undefined, 'Test')).toThrow(ValidationError);
      expect(() => validateString({}, 'Test')).toThrow(ValidationError);
    });

    it('should reject empty strings', () => {
      expect(() => validateString('', 'Test')).toThrow(ValidationError);
      expect(() => validateString('   ', 'Test')).toThrow(ValidationError);
    });

    it('should enforce min length', () => {
      expect(() => validateString('ab', 'Test', { minLength: 3 })).toThrow(
        ValidationError
      );
      expect(() =>
        validateString('abc', 'Test', { minLength: 3 })
      ).not.toThrow();
    });

    it('should enforce max length', () => {
      expect(() => validateString('abcdef', 'Test', { maxLength: 5 })).toThrow(
        ValidationError
      );
      expect(() =>
        validateString('abcde', 'Test', { maxLength: 5 })
      ).not.toThrow();
    });
  });

  describe('validateNoteId', () => {
    it('should accept valid UUID v4', () => {
      expect(() =>
        validateNoteId('550e8400-e29b-41d4-a716-446655440000')
      ).not.toThrow();
      expect(() =>
        validateNoteId('6ba7b810-9dad-41d1-80b4-00c04fd430c8')
      ).not.toThrow();
    });

    it('should reject invalid UUID format', () => {
      expect(() => validateNoteId('not-a-uuid')).toThrow(ValidationError);
      expect(() =>
        validateNoteId('550e8400-e29b-11d4-a716-446655440000')
      ).toThrow(ValidationError); // UUID v1
      expect(() => validateNoteId('123')).toThrow(ValidationError);
      expect(() => validateNoteId('')).toThrow(ValidationError);
    });

    it('should reject non-strings', () => {
      expect(() => validateNoteId(123 as any)).toThrow(ValidationError);
      expect(() => validateNoteId(null as any)).toThrow(ValidationError);
      expect(() => validateNoteId(undefined as any)).toThrow(ValidationError);
    });
  });

  describe('validateTagName', () => {
    it('should accept valid tag names', () => {
      expect(() => validateTagName('javascript')).not.toThrow();
      expect(() => validateTagName('my-tag')).not.toThrow();
      expect(() => validateTagName('tag_123')).not.toThrow();
    });

    it('should reject empty tag names', () => {
      expect(() => validateTagName('')).toThrow(ValidationError);
      expect(() => validateTagName('   ')).toThrow(ValidationError);
    });

    it('should reject tag names exceeding max length', () => {
      const longTag = 'a'.repeat(VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH + 1);
      expect(() => validateTagName(longTag)).toThrow(ValidationError);
    });

    it('should accept tag names at max length', () => {
      const maxTag = 'a'.repeat(VALIDATION_LIMITS.TAG_NAME_MAX_LENGTH);
      expect(() => validateTagName(maxTag)).not.toThrow();
    });

    it('should reject invalid characters', () => {
      expect(() => validateTagName('tag<script>')).toThrow(ValidationError);
      expect(() => validateTagName('tag/path')).toThrow(ValidationError);
      expect(() => validateTagName('tag:name')).toThrow(ValidationError);
      expect(() => validateTagName('tag|pipe')).toThrow(ValidationError);
    });

    it('should reject non-strings', () => {
      expect(() => validateTagName(123 as any)).toThrow(ValidationError);
      expect(() => validateTagName(null as any)).toThrow(ValidationError);
    });
  });

  describe('validatePositiveNumber', () => {
    it('should accept valid positive integers', () => {
      expect(() => validatePositiveNumber(0, 'Test')).not.toThrow();
      expect(() => validatePositiveNumber(1, 'Test')).not.toThrow();
      expect(() => validatePositiveNumber(100, 'Test')).not.toThrow();
    });

    it('should reject negative numbers', () => {
      expect(() => validatePositiveNumber(-1, 'Test')).toThrow(ValidationError);
      expect(() => validatePositiveNumber(-100, 'Test')).toThrow(
        ValidationError
      );
    });

    it('should reject non-integers', () => {
      expect(() => validatePositiveNumber(1.5, 'Test')).toThrow(
        ValidationError
      );
      expect(() => validatePositiveNumber(0.1, 'Test')).toThrow(
        ValidationError
      );
    });

    it('should reject NaN', () => {
      expect(() => validatePositiveNumber(NaN, 'Test')).toThrow(
        ValidationError
      );
    });

    it('should reject Infinity', () => {
      expect(() => validatePositiveNumber(Infinity, 'Test')).toThrow(
        ValidationError
      );
      expect(() => validatePositiveNumber(-Infinity, 'Test')).toThrow(
        ValidationError
      );
    });

    it('should reject non-numbers', () => {
      expect(() => validatePositiveNumber('123' as any, 'Test')).toThrow(
        ValidationError
      );
      expect(() => validatePositiveNumber(null as any, 'Test')).toThrow(
        ValidationError
      );
    });
  });

  describe('validateFilePath', () => {
    const notesDir = '/home/user/notes';

    it('should accept valid absolute paths within notes directory', () => {
      expect(() =>
        validateFilePath('/home/user/notes/note.md', notesDir)
      ).not.toThrow();
      expect(() =>
        validateFilePath('/home/user/notes/subfolder/note.md', notesDir)
      ).not.toThrow();
    });

    it('should reject relative paths', () => {
      expect(() => validateFilePath('./note.md', notesDir)).toThrow(
        ValidationError
      );
      expect(() => validateFilePath('../note.md', notesDir)).toThrow(
        ValidationError
      );
      expect(() => validateFilePath('note.md', notesDir)).toThrow(
        ValidationError
      );
    });

    it('should reject paths outside notes directory (path traversal)', () => {
      expect(() =>
        validateFilePath('/home/user/other/note.md', notesDir)
      ).toThrow(ValidationError);
      expect(() => validateFilePath('/etc/passwd', notesDir)).toThrow(
        ValidationError
      );
    });

    it('should reject paths without .md extension', () => {
      expect(() =>
        validateFilePath('/home/user/notes/note.txt', notesDir)
      ).toThrow(ValidationError);
      expect(() => validateFilePath('/home/user/notes/note', notesDir)).toThrow(
        ValidationError
      );
    });

    it('should reject invalid characters in filename', () => {
      expect(() =>
        validateFilePath('/home/user/notes/note<test>.md', notesDir)
      ).toThrow(ValidationError);
      expect(() =>
        validateFilePath('/home/user/notes/note|test.md', notesDir)
      ).toThrow(ValidationError);
    });

    it('should reject non-strings', () => {
      expect(() => validateFilePath(123 as any, notesDir)).toThrow(
        ValidationError
      );
      expect(() => validateFilePath(null as any, notesDir)).toThrow(
        ValidationError
      );
    });

    it('should handle normalized paths correctly', () => {
      // Test that path normalization prevents traversal
      expect(() =>
        validateFilePath('/home/user/notes/../other/note.md', notesDir)
      ).toThrow(ValidationError);
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      expect(() => validateSearchQuery('test')).not.toThrow();
      expect(() => validateSearchQuery('search term')).not.toThrow();
      expect(() => validateSearchQuery('')).not.toThrow(); // Empty is allowed
    });

    it('should reject very long queries', () => {
      const longQuery = 'a'.repeat(501);
      expect(() => validateSearchQuery(longQuery)).toThrow(ValidationError);
    });

    it('should accept queries at max length', () => {
      const maxQuery = 'a'.repeat(500);
      expect(() => validateSearchQuery(maxQuery)).not.toThrow();
    });

    it('should reject non-strings', () => {
      expect(() => validateSearchQuery(123 as any)).toThrow(ValidationError);
      expect(() => validateSearchQuery(null as any)).toThrow(ValidationError);
    });
  });

  describe('sanitizeNoteTitle', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(sanitizeNoteTitle('  My Note  ')).toBe('My Note');
      expect(sanitizeNoteTitle('\t My Note \t')).toBe('My Note');
      expect(sanitizeNoteTitle('\n My Note \n')).toBe('My Note');
    });

    it('should normalize internal whitespace to single spaces', () => {
      expect(sanitizeNoteTitle('My  Note')).toBe('My Note');
      expect(sanitizeNoteTitle('My   Note')).toBe('My Note');
      expect(sanitizeNoteTitle('My\t\tNote')).toBe('My Note');
      expect(sanitizeNoteTitle('My\n\nNote')).toBe('My Note');
      expect(sanitizeNoteTitle('My \t\n Note')).toBe('My Note');
    });

    it('should handle multiple words with irregular spacing', () => {
      expect(sanitizeNoteTitle('  This   is  a   test  ')).toBe(
        'This is a test'
      );
    });

    it('should preserve single spaces', () => {
      expect(sanitizeNoteTitle('My Note Title')).toBe('My Note Title');
    });

    it('should return empty string for non-string inputs', () => {
      expect(sanitizeNoteTitle(123 as any)).toBe('');
      expect(sanitizeNoteTitle(null as any)).toBe('');
      expect(sanitizeNoteTitle(undefined as any)).toBe('');
    });

    it('should return empty string for whitespace-only inputs', () => {
      expect(sanitizeNoteTitle('   ')).toBe('');
      expect(sanitizeNoteTitle('\t\t')).toBe('');
      expect(sanitizeNoteTitle('\n\n')).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeNoteTitle('')).toBe('');
    });

    it('should preserve case', () => {
      expect(sanitizeNoteTitle('My Title')).toBe('My Title');
      expect(sanitizeNoteTitle('MY TITLE')).toBe('MY TITLE');
    });
  });

  describe('sanitizeTagName', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(sanitizeTagName('  javascript  ')).toBe('javascript');
      expect(sanitizeTagName('\t javascript \t')).toBe('javascript');
    });

    it('should normalize internal whitespace to single spaces', () => {
      expect(sanitizeTagName('my  tag')).toBe('my tag');
      expect(sanitizeTagName('my   tag')).toBe('my tag');
      expect(sanitizeTagName('my\t\ttag')).toBe('my tag');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeTagName('JavaScript')).toBe('javascript');
      expect(sanitizeTagName('MY TAG')).toBe('my tag');
      expect(sanitizeTagName('CamelCase')).toBe('camelcase');
    });

    it('should combine all transformations', () => {
      expect(sanitizeTagName('  JavaScript  ')).toBe('javascript');
      expect(sanitizeTagName('  My  Tag  ')).toBe('my tag');
      expect(sanitizeTagName('\tMy\t\tTag\t')).toBe('my tag');
    });

    it('should return empty string for non-string inputs', () => {
      expect(sanitizeTagName(123 as any)).toBe('');
      expect(sanitizeTagName(null as any)).toBe('');
      expect(sanitizeTagName(undefined as any)).toBe('');
    });

    it('should return empty string for whitespace-only inputs', () => {
      expect(sanitizeTagName('   ')).toBe('');
      expect(sanitizeTagName('\t\t')).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeTagName('')).toBe('');
    });

    it('should prevent duplicate-looking tags', () => {
      // All of these should result in the same sanitized value
      expect(sanitizeTagName('JavaScript')).toBe('javascript');
      expect(sanitizeTagName('javascript')).toBe('javascript');
      expect(sanitizeTagName('  JavaScript  ')).toBe('javascript');
      expect(sanitizeTagName('JAVASCRIPT')).toBe('javascript');
    });
  });
});
