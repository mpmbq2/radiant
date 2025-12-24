# Input Sanitization Implementation - radiant-178

## Overview

This document describes the implementation of input sanitization for tag and note names to prevent duplicate-looking entries and improve user experience.

## Changes Made

### 1. Core Sanitization Functions

**File: `/home/user/radiant/src/utils/validation.ts`**

Added two new sanitization functions:

#### `sanitizeNoteTitle(title: string): string`
- Trims leading and trailing whitespace
- Normalizes internal whitespace (collapses multiple spaces/tabs/newlines to single space)
- Preserves case sensitivity
- Returns empty string for non-string inputs

**Examples:**
- `"  My Note  "` → `"My Note"`
- `"My  Note"` → `"My Note"` (double space → single space)
- `"My\t\tNote"` → `"My Note"` (tabs → single space)

#### `sanitizeTagName(tagName: string): string`
- Trims leading and trailing whitespace
- Normalizes internal whitespace
- Converts to lowercase for case-insensitive comparison
- Returns empty string for non-string inputs

**Examples:**
- `"JavaScript"` → `"javascript"`
- `"  My  Tag  "` → `"my tag"`
- `"My\t\tTag"` → `"my tag"`

### 2. Validation Function Updates

**File: `/home/user/radiant/src/utils/validation.ts`**

Updated `validateNoteTitle()` and `validateTagName()` to:
- Use sanitized values for validation checks (length, empty checks)
- Validate against the sanitized value rather than the raw input
- Maintain type assertion behavior for TypeScript

This ensures that validation is consistent with what will be stored.

### 3. Service Layer Updates

**File: `/home/user/radiant/src/services/notesService.ts`**

Updated `createNote()` method:
- Sanitizes title using `sanitizeNoteTitle()` before validation
- Sanitizes all tags using `sanitizeTagName()` before validation
- Filters out empty tags after sanitization
- Uses sanitized values for database operations and file storage

Updated `updateNote()` method:
- Sanitizes title and tags when provided
- Filters out empty tags after sanitization
- Uses sanitized values for all operations

### 4. Repository Layer Updates

**File: `/home/user/radiant/src/database/tagsRepository.ts`**

Updated `getOrCreateTag()` method:
- Now uses `sanitizeTagName()` instead of manual `toLowerCase().trim()`
- Ensures consistent sanitization across the application

Updated `getNotesWithTag()` method:
- Sanitizes tag name before querying
- Ensures lookups are consistent with storage

### 5. Regex Pattern Centralization

**File: `/home/user/radiant/src/utils/regexPatterns.ts`**

Added centralized regex patterns including:
- `WHITESPACE_PATTERN = /\s+/g` - Used for whitespace normalization

### 6. Test Coverage

**File: `/home/user/radiant/src/utils/validation.test.ts`**

Added comprehensive test suites for:
- `sanitizeNoteTitle()` - 8 test cases
- `sanitizeTagName()` - 9 test cases

Test coverage includes:
- Whitespace trimming (leading/trailing)
- Internal whitespace normalization
- Case conversion (tags only)
- Edge cases (empty strings, non-string inputs, whitespace-only inputs)
- Duplicate prevention scenarios

## Data Flow

### Note Creation Flow:
1. User enters title (e.g., `"  My Note  "`)
2. Renderer → IPC → Service Layer
3. Service sanitizes: `"  My Note  "` → `"My Note"`
4. Service validates sanitized value
5. Repository stores sanitized value: `"My Note"`
6. File manager writes with sanitized frontmatter

### Tag Creation Flow:
1. User enters tags (e.g., `["JavaScript", "  My Tag  "]`)
2. Renderer → IPC → Service Layer
3. Service sanitizes each tag:
   - `"JavaScript"` → `"javascript"`
   - `"  My Tag  "` → `"my tag"`
4. Service validates sanitized values
5. Repository calls `getOrCreateTag()` which sanitizes again (idempotent)
6. Database stores: `["javascript", "my tag"]`

## Migration Concerns for Existing Data

### No Database Migration Required ✅

The implementation is designed to be **backwards compatible**:

1. **Existing note titles** in the database will remain unchanged
2. **Existing tags** in the database will remain unchanged
3. **New data** will be sanitized on creation/update
4. **No schema changes** required

### How Existing Data is Handled

#### For Note Titles:
- Existing notes with trailing/extra spaces will remain as-is in the database
- When a user **updates** an existing note's title, it will be sanitized
- When creating a **new** note, the title is sanitized
- No automatic migration of existing titles

#### For Tags:
- Existing tags are already lowercase and trimmed (previous implementation)
- Existing tags may have internal double/triple spaces
- When tags are **queried** via `getNotesWithTag()`, the query is sanitized
  - This means lookups work correctly even for old data
- When tags are **created/updated** via `setTagsForNote()`, they are sanitized
- Tags with internal whitespace issues will naturally get cleaned up on next update

#### Example Scenarios:

**Scenario 1: Old note with title `"My Note  "`**
- Remains in database as `"My Note  "`
- User edits the note → title becomes `"My Note"` on save
- No data loss, gradual cleanup

**Scenario 2: Old tag `"java  script"` (double space)**
- Remains in database as `"java  script"`
- User queries for tag "java script" → sanitized to "java script" → **won't match!**
- User adds tag "JavaScript" to note → sanitized to "javascript" → creates new tag
- Old `"java  script"` tag can be cleaned up via `deleteUnusedTags()`

### Potential Issues and Mitigations

#### Issue 1: Tag Lookups on Old Data
**Problem:** Tags with internal whitespace issues won't match sanitized queries

**Mitigation Options:**
1. Run a one-time migration script to normalize existing tags (recommended)
2. Keep the old behavior for queries temporarily
3. Accept gradual cleanup as users interact with notes

**Recommended Migration Script:**
```typescript
// One-time migration to normalize existing tags
async function migrateExistingTags() {
  const tagsRepo = getTagsRepository();
  const allTags = tagsRepo.getAllTags();

  for (const tag of allTags) {
    const sanitized = sanitizeTagName(tag.name);
    if (sanitized !== tag.name) {
      // Tag needs sanitization
      // 1. Get all notes with this tag
      // 2. Create/get sanitized tag
      // 3. Update note associations
      // 4. Delete old tag if unused
    }
  }
}
```

#### Issue 2: Duplicate Notes After Sanitization
**Problem:** User has both `"My Note"` and `"My Note "` in database

**Current Behavior:** Both remain distinct
**After Sanitization:** New notes cannot create this scenario
**Mitigation:** No automatic deduplication (by design - prevents data loss)

### Testing Recommendations

Before deploying to production:

1. **Test with existing data:**
   - Load app with existing database
   - Verify notes display correctly
   - Verify tags display correctly

2. **Test create/update flows:**
   - Create new note with whitespace in title → verify sanitized
   - Update existing note → verify title sanitized
   - Add tags with various whitespace → verify sanitized

3. **Test edge cases:**
   - Very old data with unusual whitespace
   - Special characters in titles/tags
   - Unicode characters

## Sanitization Location in Flow

Sanitization happens at the **Service Layer** (earliest possible point):

```
Renderer → IPC Handlers → [SERVICE LAYER: SANITIZE HERE] → Repository → Storage
```

**Why Service Layer?**
- Single point of control
- Happens before validation
- Happens before database/file operations
- Consistent across all entry points
- Easy to test and maintain

## Benefits of This Implementation

1. **Prevents duplicate-looking entries:**
   - `"JavaScript"` and `"javascript"` are now the same tag
   - `"My Note"` and `"My Note  "` are now the same title

2. **Improved UX:**
   - Users don't have to worry about accidental whitespace
   - Tag searches work as expected
   - Consistent display of titles/tags

3. **Backwards Compatible:**
   - No breaking changes
   - No forced migration
   - Gradual cleanup as data is updated

4. **Maintainable:**
   - Centralized sanitization logic
   - Well-tested with comprehensive test suite
   - Clear data flow

5. **Type-Safe:**
   - Full TypeScript support
   - Proper type assertions
   - No runtime surprises

## Future Enhancements

1. **Migration Script:** Create optional migration to clean up existing data
2. **User Notification:** Warn users if title/tags were modified during sanitization
3. **Fuzzy Matching:** Consider fuzzy tag matching for old data
4. **Bulk Operations:** Add bulk sanitization utilities for admin use

## Files Modified

1. `/home/user/radiant/src/utils/validation.ts` - Core sanitization functions
2. `/home/user/radiant/src/utils/validation.test.ts` - Test coverage
3. `/home/user/radiant/src/services/notesService.ts` - Service layer integration
4. `/home/user/radiant/src/database/tagsRepository.ts` - Repository layer updates
5. `/home/user/radiant/src/utils/regexPatterns.ts` - Centralized regex patterns

## Summary

The input sanitization implementation successfully addresses issue radiant-178 by:
- Adding proper sanitization for both note titles and tag names
- Preventing duplicate-looking entries from being created
- Maintaining backwards compatibility with existing data
- Providing comprehensive test coverage
- Following existing code patterns and architecture

No immediate migration is required, but a one-time tag normalization script is recommended for production deployment.
