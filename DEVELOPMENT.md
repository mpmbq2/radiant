# Development Guide

## Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

## Installation
```bash
npm install
```

## Running in Development
```bash
npm start
```
This starts the Electron app with hot module replacement.

## Project Structure
- `src/main.ts` - Main process (Node.js)
- `src/preload.ts` - Secure IPC bridge
- `src/renderer.ts` - Renderer process entry point
- `src/App.svelte` - Main Svelte component
- `forge.config.ts` - Electron Forge configuration
- `vite.renderer.config.ts` - Vite configuration for renderer

## Building
```bash
npm run package
```

## Code Formatting
```bash
npm run format
```

## Error Handling Strategy

This application follows a consistent error handling pattern across all architectural layers. Each layer has a specific responsibility for how it handles errors.

### Layer-by-Layer Strategy

#### 1. Repository Layer (`src/database/`)
**Responsibility**: Always throw errors with clear, context-specific messages.

- Log the error for debugging
- Re-throw the original error (preserve stack trace)
- Include contextual information in log messages (e.g., note ID, operation type)

```typescript
// Example: notesRepository.ts
getNoteById(noteId: string): Note | null {
  try {
    // ... database operation
  } catch (error) {
    logger.error(`Error getting note ${noteId}:`, error);
    throw error; // Always re-throw
  }
}
```

#### 2. Storage Layer (`src/storage/`)
**Responsibility**: Throw custom errors with user-friendly messages and error codes.

- Use `FileSystemError` class with specific error codes
- Map low-level Node.js errors to meaningful codes
- Provide actionable error messages for users

```typescript
// Example: fileManager.ts
readNote(filePath: string) {
  try {
    // ... file operation
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    const errorCode = FileSystemError.mapNodeError(nodeError);
    throw new FileSystemError(errorCode, filePath, nodeError);
  }
}
```

#### 3. Service Layer (`src/services/`)
**Responsibility**: Let errors propagate naturally, add business context when needed.

- Let most errors bubble up from repositories/storage
- Add business-level context for complex operations
- NEVER swallow errors silently
- For optional/graceful degradation cases, handle explicitly and document why

```typescript
// Good: Let errors propagate
async createNote(input: CreateNoteInput): Promise<NoteWithContent> {
  validateNoteTitle(input.title);
  const note = this.notesRepo.createNote(noteId, input.title, filePath);
  fileManager.writeNote(filePath, content, frontmatter); // Let errors bubble
  return note;
}

// Bad: Silent error swallowing
private enrichNoteWithContent(note: Note): NoteWithContent {
  try {
    return { ...note, content: fileManager.readNote(note.file_path) };
  } catch (error) {
    logger.error('Error reading note:', error);
    return { ...note, content: '' }; // ❌ NEVER DO THIS
  }
}
```

#### 4. IPC Layer (`src/ipc/`)
**Responsibility**: Catch errors and return serializable error objects to renderer.

- Log errors with context
- Return structured error objects (not throw)
- Ensure error objects are serializable (plain objects, not Error instances)
- Include error type, message, and optional code

```typescript
// Example: createIpcHandler.ts returns error objects
ipcMain.handle(channel, async (_event, ...args) => {
  try {
    return { success: true, data: await handler(...args) };
  } catch (error) {
    logger.error(`Error ${errorContext}:`, error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof FileSystemError ? error.code : undefined,
      },
    };
  }
});
```

#### 5. Renderer Layer (`src/renderer/`)
**Responsibility**: Handle errors in UI state and display to users.

- Check for error responses from IPC
- Update store error state
- Display user-friendly error messages in UI
- Use `withLoading` helper for consistent error handling

```typescript
// Example: notesStore.ts
createNote: async (title, content, tags) => {
  await withLoading(
    set,
    async () => {
      const response = await window.electronAPI.notes.create({ title, content, tags });
      if (!response.success) {
        throw new Error(response.error.message);
      }
      set({ notes: [response.data, ...state.notes] });
    },
    'Create note',
    { rethrow: true } // Let withLoading set error state
  );
}
```

### Error Flow Diagram

```
User Action (Renderer)
  ↓
IPC Call
  ↓
Service Layer → validates, orchestrates
  ↓
Repository/Storage → throws on failure
  ↓
Service Layer → lets error bubble
  ↓
IPC Handler → catches, returns { success: false, error: {...} }
  ↓
Renderer → checks response.success, updates UI state
  ↓
User sees friendly error message
```

### Key Principles

1. **Never swallow errors silently** - Always propagate or explicitly handle with justification
2. **Log before throwing** - Helps debugging without losing error context
3. **One source of truth** - IPC boundary is where errors become data
4. **User-friendly messages** - FileSystemError and service validation provide actionable feedback
5. **Preserve stack traces** - Re-throw original errors when possible
6. **Serializable across IPC** - Return plain objects, not Error instances

### Testing Error Handling

When testing error propagation:

1. Verify repository throws on database errors
2. Verify service lets errors bubble
3. Verify IPC returns error objects (not throws)
4. Verify renderer updates error state
5. Verify user sees meaningful error message
