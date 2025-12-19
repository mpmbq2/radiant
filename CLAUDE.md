# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radiant is an AI-powered note-taking desktop application built with Electron, Svelte 5, and TypeScript. It features a dual-storage architecture combining SQLite for metadata and markdown files with YAML frontmatter for content.

## Development Commands

```bash
# Start development server with hot reload
npm start

# Build and package the application
npm run package

# Create distribution packages
npm run make

# Code quality
npm run lint
npm run format

# Issue tracking (via bd/beads)
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress
bd close <id>
bd sync               # Sync with git
```

## Architecture

### Process Model (Electron)

The application follows Electron's multi-process architecture with strict security boundaries:

- **Main Process** (`src/main.ts`): Node.js runtime handling database, file I/O, and window management
- **Preload Script** (`src/preload.ts`): Secure IPC bridge using `contextBridge` to expose safe APIs to renderer
- **Renderer Process** (`src/renderer.ts`, `src/App.svelte`): Browser context running Svelte 5 UI with no Node.js access

Security is enforced via:
- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`

### Data Layer Architecture

The app uses a **dual-storage pattern** where metadata lives in SQLite and content lives in markdown files:

**SQLite Database** (`src/database/`):
- `schema.ts`: TypeScript interfaces for Note, Tag, NoteTag
- `connection.ts`: Database initialization with WAL mode enabled
- `notesRepository.ts`: CRUD for notes metadata
- `tagsRepository.ts`: Tag management and note-tag associations
- `migrations.ts`: Schema versioning

**File Storage** (`src/storage/`):
- `fileManager.ts`: Reads/writes markdown files with YAML frontmatter using `gray-matter`
- Files stored in user data directory (`app.getPath('userData')/notes/`)
- Frontmatter contains: title, tags, created_at, modified_at

**Service Layer** (`src/services/`):
- `notesService.ts`: Orchestrates database + file operations, ensuring both stay in sync
- All CRUD operations go through this service to maintain consistency

### IPC Communication

The renderer communicates with the main process exclusively through IPC handlers:

- IPC handlers registered in `src/ipc/notesHandlers.ts`
- Exposed to renderer via `window.electronAPI` in preload script
- All operations return Promises and use `ipcRenderer.invoke()`

### State Management (Renderer)

- **Zustand** (`src/renderer/stores/notesStore.ts`): Vanilla store pattern for notes state
- Store handles async IPC calls and manages UI state (loading, errors, sidebar collapse)
- Svelte components subscribe directly to the store

### UI Components (Svelte 5)

- `App.svelte`: Root component managing layout and keyboard shortcuts
- `Sidebar.svelte`: Note list and search interface
- `EditorView.svelte`: Main editing area
- `Editor.svelte`: TipTap rich text editor integration
- Uses Svelte 5 runes (`$state`, `$derived`, `$effect`) instead of legacy reactivity

### Build System

- **Vite** for bundling with separate configs:
  - `vite.main.config.ts`: Main process (externalizes better-sqlite3)
  - `vite.preload.config.ts`: Preload script
  - `vite.renderer.config.ts`: Renderer with Svelte plugin
- **Electron Forge** (`forge.config.ts`): Packaging and distribution
- **TailwindCSS 4.x**: Styling via PostCSS

## Important Patterns

### Svelte 5 Component Mounting

When mounting Svelte components programmatically, use the new Svelte 5 API:
```typescript
import { mount } from 'svelte';
const instance = mount(Component, { target: document.body });
```

NOT the legacy `new Component({ target })` syntax.

### Database Transactions

The repositories use better-sqlite3's synchronous API. Multi-step operations should use transactions for atomicity.

### File Frontmatter Format

Notes use gray-matter for frontmatter parsing:
```yaml
---
title: Note Title
tags: [tag1, tag2]
created_at: 1234567890
modified_at: 1234567890
---
Note content here...
```

## Configuration

Application config is in `src/config.ts`:
- User data directory: `app.getPath('userData')`
- Database path: `<userData>/radiant.db`
- Notes directory: `<userData>/notes/`
- WAL mode enabled for SQLite
- Auto-save interval: 30 seconds

## Session Completion Workflow (from AGENTS.md)

When ending a work session, complete ALL steps:

1. File issues for remaining work using `bd`
2. Run quality gates if code changed (lint, format, build)
3. Update issue status via `bd`
4. **MANDATORY**: Push to remote
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # Must show "up to date with origin"
   ```
5. Clean up stashes and prune remote branches
6. Verify all changes committed AND pushed
7. Provide context handoff for next session

**CRITICAL**: Work is NOT complete until `git push` succeeds. Never stop before pushing.
Use 'bd' for task tracking
