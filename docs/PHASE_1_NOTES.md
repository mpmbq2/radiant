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
- Error handling and validation

## Database Location
- macOS: `~/Library/Application Support/radiant/radiant.db`
- Windows: `%APPDATA%/radiant/radiant.db`
- Linux: `~/.config/radiant/radiant.db`

## Notes Directory
- Same as database location, in `notes/` subdirectory

## API Usage (Renderer)

```typescript
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
```

## Implementation Details

### Database Schema Embedded
To avoid issues with Vite not copying SQL files, the schema is embedded directly in the migrations.ts file as a template string.

### Native Module Configuration
better-sqlite3 is marked as external in vite.main.config.ts to prevent bundling issues with the native module.

### Validation
- Title: Required, max 255 characters
- Content: Max 1MB
- Tags: Max 50 per note, max 50 characters each

## Next Steps (Phase 2)
- Build proper UI components
- Integrate TipTap editor
- Add search UI
