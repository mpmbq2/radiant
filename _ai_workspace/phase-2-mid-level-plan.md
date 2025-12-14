# Phase 2: Basic UI and Editor Integration - Detailed Implementation Plan

**Objective**: Build a functional note-taking UI with a rich text editor (TipTap), note list navigation, keyboard shortcuts, and professional styling.

**Duration**: 2-3 days
**Ownership**: 100% AI-generated
**Dependencies**: Phase 1 complete

---

## Architecture Overview

Phase 2 establishes the user interface layer with a component-based architecture:

### UI Components:
1. **App.svelte**: Root component, manages global state and routing
2. **Sidebar.svelte**: Navigation, note list, search bar
3. **NoteList.svelte**: Displays list of notes with metadata
4. **Editor.svelte**: Rich text editor using TipTap
5. **Toolbar.svelte**: Formatting controls for the editor
6. **EmptyState.svelte**: Shown when no note is selected

### State Management:
- **Zustand Store**: Lightweight state management for:
  - Current note selection
  - List of all notes
  - Search query
  - UI state (sidebar collapsed, etc.)

### Editor Architecture:
- **TipTap**: Headless rich text editor framework
  - Based on ProseMirror (robust editing foundation)
  - Extensible with plugins
  - Built-in Markdown support
  - StarterKit provides common formatting

### Navigation Flow:
```
User clicks note in list
  → Store updates currentNoteId
  → Editor component reacts to state change
  → Loads note content via IPC
  → Renders in TipTap editor
```

### Why This Architecture?
- **Component isolation**: Each UI piece is independent and reusable
- **Reactive state**: Svelte's reactivity + Zustand for complex state
- **TipTap flexibility**: Can add AI streaming later (Phase 5+)
- **Keyboard-first**: Power users can navigate without mouse

---

## Implementation Steps

### Task 2.1: Install UI Dependencies
**File(s)**:
- `package.json` (modified)

**Estimated Time**: 15 minutes

**Actions**:
1. Install TipTap and extensions:
   ```bash
   npm install @tiptap/core @tiptap/pm @tiptap/starter-kit
   npm install @tiptap/extension-placeholder @tiptap/extension-typography
   ```

2. Install Svelte TipTap integration:
   ```bash
   npm install @tiptap/svelte
   ```

3. Install Zustand for state management:
   ```bash
   npm install zustand
   ```

4. Install Tailwind CSS (optional, or use custom CSS):
   ```bash
   npm install --save-dev tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

5. Install additional utilities:
   ```bash
   npm install clsx
   ```

6. Verify all dependencies in `package.json`

**Success Criteria**:
- All TipTap packages installed
- Zustand installed
- Tailwind CSS configured (if using)
- No installation errors

**Potential Issues**:
- Version conflicts: Ensure all @tiptap packages use same version
- ProseMirror peer dependencies: npm should auto-install these
- Tailwind CSS: May need additional PostCSS configuration

---

### Task 2.2: Configure Tailwind CSS (Optional)
**File(s)**:
- `tailwind.config.js` (modified)
- `postcss.config.js` (created by init)
- `src/renderer/app.css` (new)

**Estimated Time**: 20 minutes

**Actions**:
1. Update `tailwind.config.js`:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   export default {
     content: [
       './src/renderer/**/*.{html,js,svelte,ts}',
     ],
     theme: {
       extend: {
         colors: {
           primary: {
             50: '#f0f9ff',
             100: '#e0f2fe',
             200: '#bae6fd',
             300: '#7dd3fc',
             400: '#38bdf8',
             500: '#0ea5e9',
             600: '#0284c7',
             700: '#0369a1',
             800: '#075985',
             900: '#0c4a6e',
           },
         },
       },
     },
     plugins: [],
   };
   ```

2. Create `src/renderer/app.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   @layer base {
     * {
       @apply box-border;
     }

     body {
       @apply m-0 p-0 overflow-hidden;
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
     }
   }

   @layer components {
     .btn {
       @apply px-4 py-2 rounded-md font-medium transition-colors;
     }

     .btn-primary {
       @apply bg-primary-600 text-white hover:bg-primary-700;
     }

     .btn-secondary {
       @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
     }

     .input {
       @apply px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500;
     }
   }
   ```

3. Import CSS in main App component (later task)

**Alternative: Minimal Custom CSS**

If not using Tailwind, create `src/renderer/styles.css`:
```css
:root {
  --color-primary: #0ea5e9;
  --color-primary-dark: #0284c7;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-600: #4b5563;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --border-radius: 6px;
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  overflow: hidden;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
}

.input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--border-radius);
  outline: none;
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}
```

**Success Criteria**:
- Tailwind CSS configured (or custom CSS created)
- CSS imports work correctly
- No build errors
- Utility classes available (if using Tailwind)

**Potential Issues**:
- Vite + Tailwind integration: Ensure PostCSS plugin loads
- Content paths: Verify Tailwind scans all Svelte files

---

### Task 2.3: Create State Management Store
**File(s)**:
- `src/renderer/stores/notesStore.ts` (new)

**Estimated Time**: 30 minutes

**Actions**:
1. Create `src/renderer/stores/` directory:
   ```bash
   mkdir -p src/renderer/stores
   ```

2. Create `src/renderer/stores/notesStore.ts`:
   ```typescript
   import { create } from 'zustand';
   import type { NoteWithContent } from '../../database/schema';

   interface NotesState {
     // Data
     notes: NoteWithContent[];
     currentNoteId: string | null;
     currentNote: NoteWithContent | null;
     searchQuery: string;
     isLoading: boolean;
     error: string | null;

     // UI State
     isSidebarCollapsed: boolean;

     // Actions
     loadNotes: () => Promise<void>;
     createNote: (title: string, content?: string, tags?: string[]) => Promise<void>;
     selectNote: (noteId: string) => Promise<void>;
     updateNote: (noteId: string, updates: { title?: string; content?: string; tags?: string[] }) => Promise<void>;
     deleteNote: (noteId: string) => Promise<void>;
     setSearchQuery: (query: string) => void;
     toggleSidebar: () => void;
   }

   export const useNotesStore = create<NotesState>((set, get) => ({
     // Initial state
     notes: [],
     currentNoteId: null,
     currentNote: null,
     searchQuery: '',
     isLoading: false,
     error: null,
     isSidebarCollapsed: false,

     // Load all notes
     loadNotes: async () => {
       set({ isLoading: true, error: null });
       try {
         const notes = await window.electronAPI.notes.getAll();
         set({ notes, isLoading: false });
       } catch (error) {
         console.error('Failed to load notes:', error);
         set({ error: (error as Error).message, isLoading: false });
       }
     },

     // Create new note
     createNote: async (title, content = '', tags = []) => {
       set({ isLoading: true, error: null });
       try {
         const newNote = await window.electronAPI.notes.create({
           title,
           content,
           tags,
         });
         set((state) => ({
           notes: [newNote, ...state.notes],
           currentNoteId: newNote.id,
           currentNote: newNote,
           isLoading: false,
         }));
       } catch (error) {
         console.error('Failed to create note:', error);
         set({ error: (error as Error).message, isLoading: false });
         throw error;
       }
     },

     // Select and load a note
     selectNote: async (noteId) => {
       set({ isLoading: true, error: null });
       try {
         const note = await window.electronAPI.notes.getById(noteId);
         set({
           currentNoteId: noteId,
           currentNote: note,
           isLoading: false,
         });
       } catch (error) {
         console.error('Failed to load note:', error);
         set({ error: (error as Error).message, isLoading: false });
       }
     },

     // Update note
     updateNote: async (noteId, updates) => {
       try {
         const updatedNote = await window.electronAPI.notes.update({
           id: noteId,
           ...updates,
         });

         if (updatedNote) {
           set((state) => ({
             notes: state.notes.map((n) => (n.id === noteId ? updatedNote : n)),
             currentNote: state.currentNoteId === noteId ? updatedNote : state.currentNote,
           }));
         }
       } catch (error) {
         console.error('Failed to update note:', error);
         set({ error: (error as Error).message });
         throw error;
       }
     },

     // Delete note
     deleteNote: async (noteId) => {
       set({ isLoading: true, error: null });
       try {
         await window.electronAPI.notes.delete(noteId);
         set((state) => ({
           notes: state.notes.filter((n) => n.id !== noteId),
           currentNoteId: state.currentNoteId === noteId ? null : state.currentNoteId,
           currentNote: state.currentNoteId === noteId ? null : state.currentNote,
           isLoading: false,
         }));
       } catch (error) {
         console.error('Failed to delete note:', error);
         set({ error: (error as Error).message, isLoading: false });
         throw error;
       }
     },

     // Set search query
     setSearchQuery: (query) => {
       set({ searchQuery: query });
     },

     // Toggle sidebar
     toggleSidebar: () => {
       set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
     },
   }));
   ```

**Success Criteria**:
- Zustand store created with all state and actions
- TypeScript types match database schema
- All CRUD operations wrapped in store methods
- Loading and error states managed
- UI state (sidebar) included

**Potential Issues**:
- Type errors: Ensure NoteWithContent is imported correctly
- Async errors: All promise rejections should be caught

---

### Task 2.4: Create Empty State Component
**File(s)**:
- `src/renderer/components/EmptyState.svelte` (new)

**Estimated Time**: 15 minutes

**Actions**:
1. Create `src/renderer/components/` directory:
   ```bash
   mkdir -p src/renderer/components
   ```

2. Create `src/renderer/components/EmptyState.svelte`:
   ```svelte
   <script lang="ts">
     export let message: string = 'No note selected';
     export let description: string = 'Select a note from the list or create a new one';
     export let showIcon: boolean = true;
   </script>

   <div class="empty-state">
     {#if showIcon}
       <div class="icon">
         <svg
           xmlns="http://www.w3.org/2000/svg"
           width="64"
           height="64"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="1.5"
           stroke-linecap="round"
           stroke-linejoin="round"
         >
           <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
           <polyline points="14 2 14 8 20 8" />
           <line x1="16" y1="13" x2="8" y2="13" />
           <line x1="16" y1="17" x2="8" y2="17" />
           <line x1="10" y1="9" x2="8" y2="9" />
         </svg>
       </div>
     {/if}
     <h2 class="message">{message}</h2>
     <p class="description">{description}</p>
   </div>

   <style>
     .empty-state {
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       height: 100%;
       padding: 2rem;
       text-align: center;
       color: #6b7280;
     }

     .icon {
       margin-bottom: 1rem;
       opacity: 0.5;
     }

     .message {
       font-size: 1.25rem;
       font-weight: 600;
       margin-bottom: 0.5rem;
       color: #374151;
     }

     .description {
       font-size: 0.95rem;
       color: #6b7280;
     }
   </style>
   ```

**Success Criteria**:
- Component displays centered message and icon
- Props allow customization
- Styling is consistent with app theme

**Potential Issues**: None expected

---

### Task 2.5: Create Note List Item Component
**File(s)**:
- `src/renderer/components/NoteListItem.svelte` (new)

**Estimated Time**: 25 minutes

**Actions**:
1. Create `src/renderer/components/NoteListItem.svelte`:
   ```svelte
   <script lang="ts">
     import type { NoteWithContent } from '../../database/schema';

     export let note: NoteWithContent;
     export let isSelected: boolean = false;
     export let onClick: () => void;

     function formatDate(timestamp: number): string {
       const date = new Date(timestamp);
       const now = new Date();
       const diff = now.getTime() - date.getTime();
       const days = Math.floor(diff / (1000 * 60 * 60 * 24));

       if (days === 0) {
         return 'Today';
       } else if (days === 1) {
         return 'Yesterday';
       } else if (days < 7) {
         return `${days} days ago`;
       } else {
         return date.toLocaleDateString();
       }
     }

     function truncateContent(content: string, maxLength: number = 100): string {
       if (content.length <= maxLength) {
         return content;
       }
       return content.substring(0, maxLength).trim() + '...';
     }
   </script>

   <div
     class="note-item"
     class:selected={isSelected}
     on:click={onClick}
     on:keydown={(e) => e.key === 'Enter' && onClick()}
     role="button"
     tabindex="0"
   >
     <div class="note-header">
       <h3 class="note-title">{note.title || 'Untitled'}</h3>
       <span class="note-date">{formatDate(note.modified_at)}</span>
     </div>

     <p class="note-preview">{truncateContent(note.content)}</p>

     {#if note.tags.length > 0}
       <div class="note-tags">
         {#each note.tags.slice(0, 3) as tag}
           <span class="tag">{tag}</span>
         {/each}
         {#if note.tags.length > 3}
           <span class="tag-more">+{note.tags.length - 3}</span>
         {/if}
       </div>
     {/if}

     <div class="note-meta">
       <span>{note.word_count} words</span>
     </div>
   </div>

   <style>
     .note-item {
       padding: 0.75rem 1rem;
       border-bottom: 1px solid #e5e7eb;
       cursor: pointer;
       transition: background-color 0.15s;
     }

     .note-item:hover {
       background-color: #f9fafb;
     }

     .note-item.selected {
       background-color: #eff6ff;
       border-left: 3px solid #3b82f6;
     }

     .note-item:focus {
       outline: 2px solid #3b82f6;
       outline-offset: -2px;
     }

     .note-header {
       display: flex;
       justify-content: space-between;
       align-items: baseline;
       margin-bottom: 0.5rem;
     }

     .note-title {
       font-size: 0.95rem;
       font-weight: 600;
       color: #111827;
       margin: 0;
       overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;
       flex: 1;
     }

     .note-date {
       font-size: 0.75rem;
       color: #6b7280;
       flex-shrink: 0;
       margin-left: 0.5rem;
     }

     .note-preview {
       font-size: 0.85rem;
       color: #4b5563;
       margin: 0 0 0.5rem 0;
       line-height: 1.4;
       overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;
     }

     .note-tags {
       display: flex;
       gap: 0.25rem;
       flex-wrap: wrap;
       margin-bottom: 0.5rem;
     }

     .tag {
       font-size: 0.7rem;
       padding: 0.125rem 0.5rem;
       background-color: #e0e7ff;
       color: #3730a3;
       border-radius: 9999px;
     }

     .tag-more {
       font-size: 0.7rem;
       padding: 0.125rem 0.5rem;
       background-color: #f3f4f6;
       color: #6b7280;
       border-radius: 9999px;
     }

     .note-meta {
       font-size: 0.75rem;
       color: #9ca3af;
     }
   </style>
   ```

**Success Criteria**:
- Displays note title, preview, date, tags, and word count
- Shows selected state visually
- Responsive to clicks and keyboard
- Truncates long content gracefully

**Potential Issues**:
- Date formatting edge cases: Test with various timestamps
- Overflow handling: Ensure long titles don't break layout

---

### Task 2.6: Create Note List Component
**File(s)**:
- `src/renderer/components/NoteList.svelte` (new)

**Estimated Time**: 25 minutes

**Actions**:
1. Create `src/renderer/components/NoteList.svelte`:
   ```svelte
   <script lang="ts">
     import { useNotesStore } from '../stores/notesStore';
     import NoteListItem from './NoteListItem.svelte';
     import type { NoteWithContent } from '../../database/schema';

     const store = useNotesStore();

     $: notes = $store.notes;
     $: currentNoteId = $store.currentNoteId;
     $: searchQuery = $store.searchQuery;

     // Filter notes based on search query
     $: filteredNotes = searchQuery
       ? notes.filter(
           (note) =>
             note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
             note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
         )
       : notes;

     function handleNoteClick(noteId: string) {
       store.selectNote(noteId);
     }
   </script>

   <div class="note-list">
     {#if filteredNotes.length === 0}
       <div class="empty-message">
         {#if searchQuery}
           <p>No notes found matching "{searchQuery}"</p>
         {:else}
           <p>No notes yet. Create your first note!</p>
         {/if}
       </div>
     {:else}
       <div class="list-header">
         <span class="count">{filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}</span>
       </div>
       <div class="list-items">
         {#each filteredNotes as note (note.id)}
           <NoteListItem
             {note}
             isSelected={note.id === currentNoteId}
             onClick={() => handleNoteClick(note.id)}
           />
         {/each}
       </div>
     {/if}
   </div>

   <style>
     .note-list {
       display: flex;
       flex-direction: column;
       height: 100%;
       overflow: hidden;
     }

     .list-header {
       padding: 0.75rem 1rem;
       border-bottom: 1px solid #e5e7eb;
       background-color: #f9fafb;
     }

     .count {
       font-size: 0.85rem;
       font-weight: 600;
       color: #6b7280;
       text-transform: uppercase;
       letter-spacing: 0.05em;
     }

     .list-items {
       flex: 1;
       overflow-y: auto;
     }

     .empty-message {
       display: flex;
       align-items: center;
       justify-content: center;
       height: 100%;
       padding: 2rem;
       text-align: center;
     }

     .empty-message p {
       color: #6b7280;
       font-size: 0.95rem;
     }
   </style>
   ```

**Success Criteria**:
- Displays filtered list of notes
- Shows count of notes
- Handles empty state
- Integrates with Zustand store
- Scrollable list

**Potential Issues**:
- Performance with many notes: Virtual scrolling may be needed later
- Search performance: Consider debouncing in future

---

### Task 2.7: Create Search Bar Component
**File(s)**:
- `src/renderer/components/SearchBar.svelte` (new)

**Estimated Time**: 20 minutes

**Actions**:
1. Create `src/renderer/components/SearchBar.svelte`:
   ```svelte
   <script lang="ts">
     import { useNotesStore } from '../stores/notesStore';

     const store = useNotesStore();

     let searchInput = '';

     $: {
       // Update store when input changes
       store.setSearchQuery(searchInput);
     }

     function clearSearch() {
       searchInput = '';
     }

     function handleKeydown(event: KeyboardEvent) {
       if (event.key === 'Escape') {
         clearSearch();
       }
     }
   </script>

   <div class="search-bar">
     <div class="search-input-wrapper">
       <svg
         class="search-icon"
         xmlns="http://www.w3.org/2000/svg"
         width="18"
         height="18"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         stroke-width="2"
         stroke-linecap="round"
         stroke-linejoin="round"
       >
         <circle cx="11" cy="11" r="8" />
         <path d="m21 21-4.35-4.35" />
       </svg>

       <input
         type="text"
         bind:value={searchInput}
         on:keydown={handleKeydown}
         placeholder="Search notes..."
         class="search-input"
       />

       {#if searchInput}
         <button class="clear-button" on:click={clearSearch} aria-label="Clear search">
           <svg
             xmlns="http://www.w3.org/2000/svg"
             width="16"
             height="16"
             viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2"
             stroke-linecap="round"
             stroke-linejoin="round"
           >
             <line x1="18" y1="6" x2="6" y2="18" />
             <line x1="6" y1="6" x2="18" y2="18" />
           </svg>
         </button>
       {/if}
     </div>
   </div>

   <style>
     .search-bar {
       padding: 1rem;
       border-bottom: 1px solid #e5e7eb;
     }

     .search-input-wrapper {
       position: relative;
       display: flex;
       align-items: center;
     }

     .search-icon {
       position: absolute;
       left: 0.75rem;
       color: #9ca3af;
       pointer-events: none;
     }

     .search-input {
       width: 100%;
       padding: 0.5rem 2.5rem 0.5rem 2.5rem;
       border: 1px solid #d1d5db;
       border-radius: 6px;
       font-size: 0.9rem;
       outline: none;
       transition: border-color 0.15s, box-shadow 0.15s;
     }

     .search-input:focus {
       border-color: #3b82f6;
       box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
     }

     .search-input::placeholder {
       color: #9ca3af;
     }

     .clear-button {
       position: absolute;
       right: 0.5rem;
       padding: 0.25rem;
       background: none;
       border: none;
       cursor: pointer;
       color: #9ca3af;
       display: flex;
       align-items: center;
       justify-content: center;
       border-radius: 4px;
       transition: background-color 0.15s, color 0.15s;
     }

     .clear-button:hover {
       background-color: #f3f4f6;
       color: #6b7280;
     }
   </style>
   ```

**Success Criteria**:
- Search input updates store in real-time
- Shows search icon
- Clear button appears when there's input
- Escape key clears search
- Proper focus styles

**Potential Issues**:
- Performance: May need debouncing for large note sets (add later if needed)

---

### Task 2.8: Create Sidebar Component
**File(s)**:
- `src/renderer/components/Sidebar.svelte` (new)

**Estimated Time**: 30 minutes

**Actions**:
1. Create `src/renderer/components/Sidebar.svelte`:
   ```svelte
   <script lang="ts">
     import { useNotesStore } from '../stores/notesStore';
     import SearchBar from './SearchBar.svelte';
     import NoteList from './NoteList.svelte';

     const store = useNotesStore();

     async function handleNewNote() {
       const title = `Note ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
       await store.createNote(title, '');
     }
   </script>

   <div class="sidebar">
     <div class="sidebar-header">
       <h1 class="app-title">Radiant</h1>
       <button class="new-note-button" on:click={handleNewNote} title="New Note (Cmd+N)">
         <svg
           xmlns="http://www.w3.org/2000/svg"
           width="20"
           height="20"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round"
         >
           <path d="M12 5v14" />
           <path d="M5 12h14" />
         </svg>
       </button>
     </div>

     <SearchBar />

     <div class="sidebar-content">
       <NoteList />
     </div>
   </div>

   <style>
     .sidebar {
       display: flex;
       flex-direction: column;
       width: 280px;
       height: 100vh;
       background-color: #ffffff;
       border-right: 1px solid #e5e7eb;
     }

     .sidebar-header {
       display: flex;
       align-items: center;
       justify-content: space-between;
       padding: 1rem;
       border-bottom: 1px solid #e5e7eb;
     }

     .app-title {
       font-size: 1.25rem;
       font-weight: 700;
       color: #111827;
       margin: 0;
     }

     .new-note-button {
       display: flex;
       align-items: center;
       justify-content: center;
       width: 36px;
       height: 36px;
       border: none;
       background-color: #3b82f6;
       color: white;
       border-radius: 6px;
       cursor: pointer;
       transition: background-color 0.15s;
     }

     .new-note-button:hover {
       background-color: #2563eb;
     }

     .new-note-button:active {
       background-color: #1d4ed8;
     }

     .sidebar-content {
       flex: 1;
       overflow: hidden;
     }
   </style>
   ```

**Success Criteria**:
- Displays app title and new note button
- Integrates SearchBar and NoteList
- Fixed width sidebar
- New note button creates note with timestamp title

**Potential Issues**: None expected

---

### Task 2.9: Integrate TipTap Editor
**File(s)**:
- `src/renderer/components/Editor.svelte` (new)

**Estimated Time**: 45 minutes

**Actions**:
1. Create `src/renderer/components/Editor.svelte`:
   ```svelte
   <script lang="ts">
     import { onMount, onDestroy } from 'svelte';
     import { Editor } from '@tiptap/core';
     import StarterKit from '@tiptap/starter-kit';
     import Placeholder from '@tiptap/extension-placeholder';
     import Typography from '@tiptap/extension-typography';
     import { useNotesStore } from '../stores/notesStore';

     const store = useNotesStore();

     let editorElement: HTMLDivElement;
     let editor: Editor | null = null;
     let isSaving = false;

     $: currentNote = $store.currentNote;

     // Debounced save function
     let saveTimeout: NodeJS.Timeout;
     function debouncedSave(content: string) {
       clearTimeout(saveTimeout);
       saveTimeout = setTimeout(async () => {
         if (currentNote) {
           isSaving = true;
           try {
             await store.updateNote(currentNote.id, { content });
           } catch (error) {
             console.error('Failed to save note:', error);
           } finally {
             isSaving = false;
           }
         }
       }, 1000); // Save after 1 second of inactivity
     }

     onMount(() => {
       editor = new Editor({
         element: editorElement,
         extensions: [
           StarterKit.configure({
             heading: {
               levels: [1, 2, 3],
             },
           }),
           Placeholder.configure({
             placeholder: 'Start writing...',
           }),
           Typography,
         ],
         content: currentNote?.content || '',
         editorProps: {
           attributes: {
             class: 'prose prose-sm max-w-none focus:outline-none',
           },
         },
         onUpdate: ({ editor }) => {
           const content = editor.getHTML();
           debouncedSave(content);
         },
       });
     });

     onDestroy(() => {
       if (editor) {
         editor.destroy();
       }
       clearTimeout(saveTimeout);
     });

     // Update editor content when note changes
     $: if (editor && currentNote) {
       const currentContent = editor.getHTML();
       if (currentContent !== currentNote.content) {
         editor.commands.setContent(currentNote.content);
       }
     }
   </script>

   <div class="editor-container">
     {#if isSaving}
       <div class="saving-indicator">Saving...</div>
     {/if}
     <div bind:this={editorElement} class="editor" />
   </div>

   <style>
     .editor-container {
       position: relative;
       height: 100%;
       overflow-y: auto;
     }

     .saving-indicator {
       position: absolute;
       top: 1rem;
       right: 1rem;
       padding: 0.5rem 1rem;
       background-color: #3b82f6;
       color: white;
       border-radius: 6px;
       font-size: 0.85rem;
       font-weight: 500;
       z-index: 10;
       opacity: 0.9;
     }

     .editor {
       padding: 2rem;
       min-height: 100%;
     }

     :global(.editor .ProseMirror) {
       outline: none;
     }

     :global(.editor .ProseMirror p.is-editor-empty:first-child::before) {
       content: attr(data-placeholder);
       float: left;
       color: #9ca3af;
       pointer-events: none;
       height: 0;
     }

     /* Basic prose styling */
     :global(.editor .ProseMirror) {
       font-size: 1rem;
       line-height: 1.75;
       color: #1f2937;
     }

     :global(.editor .ProseMirror h1) {
       font-size: 2em;
       font-weight: 700;
       margin-top: 0;
       margin-bottom: 0.8em;
       line-height: 1.1;
     }

     :global(.editor .ProseMirror h2) {
       font-size: 1.5em;
       font-weight: 600;
       margin-top: 1.5em;
       margin-bottom: 0.75em;
       line-height: 1.2;
     }

     :global(.editor .ProseMirror h3) {
       font-size: 1.25em;
       font-weight: 600;
       margin-top: 1.25em;
       margin-bottom: 0.5em;
       line-height: 1.3;
     }

     :global(.editor .ProseMirror p) {
       margin-top: 0;
       margin-bottom: 1em;
     }

     :global(.editor .ProseMirror ul),
     :global(.editor .ProseMirror ol) {
       padding-left: 1.5em;
       margin-top: 0;
       margin-bottom: 1em;
     }

     :global(.editor .ProseMirror li) {
       margin-top: 0.25em;
       margin-bottom: 0.25em;
     }

     :global(.editor .ProseMirror code) {
       background-color: #f3f4f6;
       padding: 0.2em 0.4em;
       border-radius: 3px;
       font-size: 0.9em;
       font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
     }

     :global(.editor .ProseMirror pre) {
       background-color: #1f2937;
       color: #f3f4f6;
       padding: 1em;
       border-radius: 6px;
       overflow-x: auto;
       margin-top: 1em;
       margin-bottom: 1em;
     }

     :global(.editor .ProseMirror pre code) {
       background-color: transparent;
       padding: 0;
       color: inherit;
     }

     :global(.editor .ProseMirror blockquote) {
       border-left: 3px solid #d1d5db;
       padding-left: 1em;
       margin-left: 0;
       margin-right: 0;
       font-style: italic;
       color: #6b7280;
     }

     :global(.editor .ProseMirror strong) {
       font-weight: 600;
     }

     :global(.editor .ProseMirror em) {
       font-style: italic;
     }
   </style>
   ```

**Success Criteria**:
- TipTap editor renders and is editable
- Content auto-saves after 1 second of inactivity
- Editor updates when different note selected
- Saving indicator shows during save
- Rich text formatting works (bold, italic, headings, lists, etc.)
- Placeholder text shown on empty editor

**Potential Issues**:
- Content sync issues: Ensure editor doesn't update during typing
- Memory leaks: Editor properly destroyed on component unmount
- Save conflicts: Debouncing prevents excessive saves

---

### Task 2.10: Create Editor Toolbar Component
**File(s)**:
- `src/renderer/components/EditorToolbar.svelte` (new)
- `src/renderer/components/Editor.svelte` (modified)

**Estimated Time**: 35 minutes

**Actions**:
1. Create `src/renderer/components/EditorToolbar.svelte`:
   ```svelte
   <script lang="ts">
     import type { Editor } from '@tiptap/core';

     export let editor: Editor | null;

     $: canUndo = editor?.can().undo() ?? false;
     $: canRedo = editor?.can().redo() ?? false;

     function toggleBold() {
       editor?.chain().focus().toggleBold().run();
     }

     function toggleItalic() {
       editor?.chain().focus().toggleItalic().run();
     }

     function toggleStrike() {
       editor?.chain().focus().toggleStrike().run();
     }

     function toggleCode() {
       editor?.chain().focus().toggleCode().run();
     }

     function setHeading(level: 1 | 2 | 3) {
       editor?.chain().focus().toggleHeading({ level }).run();
     }

     function toggleBulletList() {
       editor?.chain().focus().toggleBulletList().run();
     }

     function toggleOrderedList() {
       editor?.chain().focus().toggleOrderedList().run();
     }

     function toggleBlockquote() {
       editor?.chain().focus().toggleBlockquote().run();
     }

     function toggleCodeBlock() {
       editor?.chain().focus().toggleCodeBlock().run();
     }

     function undo() {
       editor?.chain().focus().undo().run();
     }

     function redo() {
       editor?.chain().focus().redo().run();
     }

     $: isBold = editor?.isActive('bold') ?? false;
     $: isItalic = editor?.isActive('italic') ?? false;
     $: isStrike = editor?.isActive('strike') ?? false;
     $: isCode = editor?.isActive('code') ?? false;
     $: isH1 = editor?.isActive('heading', { level: 1 }) ?? false;
     $: isH2 = editor?.isActive('heading', { level: 2 }) ?? false;
     $: isH3 = editor?.isActive('heading', { level: 3 }) ?? false;
     $: isBulletList = editor?.isActive('bulletList') ?? false;
     $: isOrderedList = editor?.isActive('orderedList') ?? false;
     $: isBlockquote = editor?.isActive('blockquote') ?? false;
     $: isCodeBlock = editor?.isActive('codeBlock') ?? false;
   </script>

   <div class="toolbar">
     <div class="toolbar-group">
       <button
         class="toolbar-button"
         class:active={isBold}
         on:click={toggleBold}
         title="Bold (Cmd+B)"
       >
         <strong>B</strong>
       </button>
       <button
         class="toolbar-button"
         class:active={isItalic}
         on:click={toggleItalic}
         title="Italic (Cmd+I)"
       >
         <em>I</em>
       </button>
       <button
         class="toolbar-button"
         class:active={isStrike}
         on:click={toggleStrike}
         title="Strikethrough"
       >
         <s>S</s>
       </button>
       <button
         class="toolbar-button"
         class:active={isCode}
         on:click={toggleCode}
         title="Inline Code"
       >
         {'</>'}
       </button>
     </div>

     <div class="toolbar-divider"></div>

     <div class="toolbar-group">
       <button
         class="toolbar-button"
         class:active={isH1}
         on:click={() => setHeading(1)}
         title="Heading 1"
       >
         H1
       </button>
       <button
         class="toolbar-button"
         class:active={isH2}
         on:click={() => setHeading(2)}
         title="Heading 2"
       >
         H2
       </button>
       <button
         class="toolbar-button"
         class:active={isH3}
         on:click={() => setHeading(3)}
         title="Heading 3"
       >
         H3
       </button>
     </div>

     <div class="toolbar-divider"></div>

     <div class="toolbar-group">
       <button
         class="toolbar-button"
         class:active={isBulletList}
         on:click={toggleBulletList}
         title="Bullet List"
       >
         •
       </button>
       <button
         class="toolbar-button"
         class:active={isOrderedList}
         on:click={toggleOrderedList}
         title="Numbered List"
       >
         1.
       </button>
       <button
         class="toolbar-button"
         class:active={isBlockquote}
         on:click={toggleBlockquote}
         title="Quote"
       >
         "
       </button>
       <button
         class="toolbar-button"
         class:active={isCodeBlock}
         on:click={toggleCodeBlock}
         title="Code Block"
       >
         {'{}'}
       </button>
     </div>

     <div class="toolbar-divider"></div>

     <div class="toolbar-group">
       <button
         class="toolbar-button"
         on:click={undo}
         disabled={!canUndo}
         title="Undo (Cmd+Z)"
       >
         ↶
       </button>
       <button
         class="toolbar-button"
         on:click={redo}
         disabled={!canRedo}
         title="Redo (Cmd+Shift+Z)"
       >
         ↷
       </button>
     </div>
   </div>

   <style>
     .toolbar {
       display: flex;
       align-items: center;
       gap: 0.25rem;
       padding: 0.75rem 1rem;
       background-color: #f9fafb;
       border-bottom: 1px solid #e5e7eb;
       flex-wrap: wrap;
     }

     .toolbar-group {
       display: flex;
       gap: 0.25rem;
     }

     .toolbar-divider {
       width: 1px;
       height: 24px;
       background-color: #d1d5db;
       margin: 0 0.5rem;
     }

     .toolbar-button {
       display: flex;
       align-items: center;
       justify-content: center;
       min-width: 32px;
       height: 32px;
       padding: 0 0.5rem;
       border: 1px solid transparent;
       background-color: transparent;
       border-radius: 4px;
       font-size: 0.9rem;
       cursor: pointer;
       transition: background-color 0.15s, border-color 0.15s;
       color: #374151;
     }

     .toolbar-button:hover:not(:disabled) {
       background-color: #e5e7eb;
     }

     .toolbar-button.active {
       background-color: #dbeafe;
       border-color: #3b82f6;
       color: #1e40af;
     }

     .toolbar-button:disabled {
       opacity: 0.4;
       cursor: not-allowed;
     }

     .toolbar-button:active:not(:disabled) {
       background-color: #d1d5db;
     }
   </style>
   ```

2. Update `src/renderer/components/Editor.svelte` to include toolbar:
   ```svelte
   <script lang="ts">
     import EditorToolbar from './EditorToolbar.svelte';
     // ... rest of existing script
   </script>

   <div class="editor-wrapper">
     {#if currentNote && editor}
       <EditorToolbar {editor} />
     {/if}
     <div class="editor-container">
       {#if isSaving}
         <div class="saving-indicator">Saving...</div>
       {/if}
       <div bind:this={editorElement} class="editor" />
     </div>
   </div>

   <style>
     .editor-wrapper {
       display: flex;
       flex-direction: column;
       height: 100%;
     }

     .editor-container {
       position: relative;
       flex: 1;
       overflow-y: auto;
     }
     /* ... rest of existing styles */
   </style>
   ```

**Success Criteria**:
- Toolbar displays all formatting buttons
- Buttons show active state when format is applied
- All formatting functions work correctly
- Undo/redo buttons enable/disable appropriately
- Keyboard shortcuts work (handled by TipTap)

**Potential Issues**:
- Active state sync: Ensure toolbar updates when cursor moves
- Button state timing: May need to force re-render on editor update

---

### Task 2.11: Create Main Editor View Component
**File(s)**:
- `src/renderer/components/EditorView.svelte` (new)

**Estimated Time**: 25 minutes

**Actions**:
1. Create `src/renderer/components/EditorView.svelte`:
   ```svelte
   <script lang="ts">
     import { useNotesStore } from '../stores/notesStore';
     import Editor from './Editor.svelte';
     import EmptyState from './EmptyState.svelte';

     const store = useNotesStore();

     $: currentNote = $store.currentNote;
     $: isLoading = $store.isLoading;

     let titleInput: HTMLInputElement;
     let isEditingTitle = false;

     function handleTitleClick() {
       isEditingTitle = true;
       setTimeout(() => {
         titleInput?.focus();
         titleInput?.select();
       }, 0);
     }

     async function handleTitleBlur() {
       isEditingTitle = false;
       if (currentNote && titleInput) {
         const newTitle = titleInput.value.trim();
         if (newTitle && newTitle !== currentNote.title) {
           await store.updateNote(currentNote.id, { title: newTitle });
         }
       }
     }

     async function handleTitleKeydown(event: KeyboardEvent) {
       if (event.key === 'Enter') {
         event.preventDefault();
         titleInput?.blur();
       } else if (event.key === 'Escape') {
         isEditingTitle = false;
         if (currentNote && titleInput) {
           titleInput.value = currentNote.title;
         }
       }
     }

     async function handleDeleteNote() {
       if (currentNote && confirm(`Delete "${currentNote.title}"?`)) {
         await store.deleteNote(currentNote.id);
       }
     }
   </script>

   <div class="editor-view">
     {#if isLoading}
       <div class="loading">
         <div class="spinner"></div>
         <p>Loading...</p>
       </div>
     {:else if currentNote}
       <div class="note-header">
         <div class="title-section">
           {#if isEditingTitle}
             <input
               bind:this={titleInput}
               type="text"
               class="title-input"
               value={currentNote.title}
               on:blur={handleTitleBlur}
               on:keydown={handleTitleKeydown}
             />
           {:else}
             <h1 class="note-title" on:click={handleTitleClick}>
               {currentNote.title || 'Untitled'}
             </h1>
           {/if}
         </div>

         <div class="header-actions">
           <button class="delete-button" on:click={handleDeleteNote} title="Delete Note">
             <svg
               xmlns="http://www.w3.org/2000/svg"
               width="18"
               height="18"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               stroke-width="2"
               stroke-linecap="round"
               stroke-linejoin="round"
             >
               <path d="M3 6h18" />
               <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
               <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
             </svg>
           </button>
         </div>
       </div>

       <Editor />
     {:else}
       <EmptyState
         message="No note selected"
         description="Select a note from the sidebar or create a new one to get started"
       />
     {/if}
   </div>

   <style>
     .editor-view {
       display: flex;
       flex-direction: column;
       height: 100vh;
       background-color: #ffffff;
     }

     .loading {
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       height: 100%;
       color: #6b7280;
     }

     .spinner {
       width: 40px;
       height: 40px;
       border: 3px solid #e5e7eb;
       border-top-color: #3b82f6;
       border-radius: 50%;
       animation: spin 0.8s linear infinite;
       margin-bottom: 1rem;
     }

     @keyframes spin {
       to {
         transform: rotate(360deg);
       }
     }

     .note-header {
       display: flex;
       align-items: center;
       justify-content: space-between;
       padding: 1.5rem 2rem 1rem 2rem;
       border-bottom: 1px solid #e5e7eb;
       background-color: #ffffff;
     }

     .title-section {
       flex: 1;
       min-width: 0;
     }

     .note-title {
       font-size: 1.75rem;
       font-weight: 700;
       color: #111827;
       margin: 0;
       cursor: pointer;
       padding: 0.25rem 0.5rem;
       border-radius: 4px;
       transition: background-color 0.15s;
     }

     .note-title:hover {
       background-color: #f3f4f6;
     }

     .title-input {
       font-size: 1.75rem;
       font-weight: 700;
       color: #111827;
       border: 2px solid #3b82f6;
       border-radius: 4px;
       padding: 0.25rem 0.5rem;
       outline: none;
       width: 100%;
       background-color: #ffffff;
     }

     .header-actions {
       display: flex;
       gap: 0.5rem;
       margin-left: 1rem;
     }

     .delete-button {
       display: flex;
       align-items: center;
       justify-content: center;
       width: 36px;
       height: 36px;
       border: none;
       background-color: transparent;
       color: #6b7280;
       border-radius: 6px;
       cursor: pointer;
       transition: background-color 0.15s, color 0.15s;
     }

     .delete-button:hover {
       background-color: #fee2e2;
       color: #dc2626;
     }
   </style>
   ```

**Success Criteria**:
- Shows empty state when no note selected
- Shows loading indicator while loading
- Displays note title (editable on click)
- Shows delete button
- Contains Editor component

**Potential Issues**:
- Title editing UX: Focus management works correctly
- Confirmation dialog: Native confirm is simple but could be custom modal later

---

### Task 2.12: Implement Keyboard Shortcuts
**File(s)**:
- `src/renderer/utils/keyboardShortcuts.ts` (new)
- `src/renderer/App.svelte` (modified)

**Estimated Time**: 30 minutes

**Actions**:
1. Create `src/renderer/utils/` directory and keyboard shortcuts handler:
   ```bash
   mkdir -p src/renderer/utils
   ```

   ```typescript
   // src/renderer/utils/keyboardShortcuts.ts
   import { useNotesStore } from '../stores/notesStore';

   export interface ShortcutHandler {
     key: string;
     modifiers: {
       ctrl?: boolean;
       meta?: boolean;
       shift?: boolean;
       alt?: boolean;
     };
     handler: (event: KeyboardEvent) => void;
     description: string;
   }

   export function createShortcutHandler(shortcuts: ShortcutHandler[]) {
     return (event: KeyboardEvent) => {
       for (const shortcut of shortcuts) {
         const isCtrlMatch = shortcut.modifiers.ctrl
           ? event.ctrlKey
           : !event.ctrlKey || event.metaKey;
         const isMetaMatch = shortcut.modifiers.meta
           ? event.metaKey
           : !event.metaKey || event.ctrlKey;
         const isShiftMatch = shortcut.modifiers.shift ? event.shiftKey : !event.shiftKey;
         const isAltMatch = shortcut.modifiers.alt ? event.altKey : !event.altKey;
         const isKeyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

         // Check if either Ctrl (Windows/Linux) or Meta (Mac) matches
         const isModifierMatch =
           (shortcut.modifiers.ctrl && (event.ctrlKey || event.metaKey)) ||
           (shortcut.modifiers.meta && (event.metaKey || event.ctrlKey));

         if (isKeyMatch && isModifierMatch && isShiftMatch && isAltMatch) {
           event.preventDefault();
           shortcut.handler(event);
           break;
         }
       }
     };
   }

   export function setupKeyboardShortcuts(): () => void {
     const store = useNotesStore.getState();

     const shortcuts: ShortcutHandler[] = [
       {
         key: 'n',
         modifiers: { ctrl: true },
         description: 'Create new note',
         handler: async () => {
           const title = `Note ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
           await store.createNote(title, '');
         },
       },
       {
         key: 's',
         modifiers: { ctrl: true },
         description: 'Save note (auto-save is enabled)',
         handler: () => {
           // Note: Auto-save is already handled by the editor
           // This shortcut is just to prevent default browser behavior
           console.log('Note is auto-saved');
         },
       },
       {
         key: 'k',
         modifiers: { ctrl: true },
         description: 'Focus search',
         handler: () => {
           const searchInput = document.querySelector('.search-input') as HTMLInputElement;
           searchInput?.focus();
         },
       },
       {
         key: 'b',
         modifiers: { ctrl: true, shift: true },
         description: 'Toggle sidebar',
         handler: () => {
           store.toggleSidebar();
         },
       },
     ];

     const handleKeydown = createShortcutHandler(shortcuts);
     window.addEventListener('keydown', handleKeydown);

     // Return cleanup function
     return () => {
       window.removeEventListener('keydown', handleKeydown);
     };
   }
   ```

**Success Criteria**:
- Cmd/Ctrl+N creates new note
- Cmd/Ctrl+S prevented (auto-save message)
- Cmd/Ctrl+K focuses search
- Cmd/Ctrl+Shift+B toggles sidebar
- Shortcuts work on both Mac (Meta) and Windows/Linux (Ctrl)

**Potential Issues**:
- Browser shortcuts conflict: Prevent default for handled shortcuts
- TipTap editor shortcuts: Ensure editor shortcuts don't conflict

---

### Task 2.13: Update Root App Component
**File(s)**:
- `src/renderer/App.svelte` (modified)
- `src/renderer/index.ts` (modified)

**Estimated Time**: 25 minutes

**Actions**:
1. Update `src/renderer/App.svelte`:
   ```svelte
   <script lang="ts">
     import { onMount, onDestroy } from 'svelte';
     import { useNotesStore } from './stores/notesStore';
     import { setupKeyboardShortcuts } from './utils/keyboardShortcuts';
     import Sidebar from './components/Sidebar.svelte';
     import EditorView from './components/EditorView.svelte';

     const store = useNotesStore();

     let cleanupShortcuts: (() => void) | null = null;

     onMount(async () => {
       // Load notes on app start
       await store.loadNotes();

       // Set up keyboard shortcuts
       cleanupShortcuts = setupKeyboardShortcuts();
     });

     onDestroy(() => {
       if (cleanupShortcuts) {
         cleanupShortcuts();
       }
     });

     $: isSidebarCollapsed = $store.isSidebarCollapsed;
   </script>

   <main class="app" class:sidebar-collapsed={isSidebarCollapsed}>
     {#if !isSidebarCollapsed}
       <Sidebar />
     {/if}
     <EditorView />
   </main>

   <style>
     :global(body) {
       margin: 0;
       padding: 0;
       overflow: hidden;
     }

     .app {
       display: flex;
       height: 100vh;
       width: 100vw;
       overflow: hidden;
     }

     .app.sidebar-collapsed {
       /* Optional: Add styles for collapsed sidebar state */
     }
   </style>
   ```

2. Update `src/renderer/index.ts` to import CSS:
   ```typescript
   import App from './App.svelte';
   import './app.css'; // or './styles.css' if using custom CSS

   const app = new App({
     target: document.getElementById('app')!,
   });

   export default app;
   ```

**Success Criteria**:
- App loads and displays sidebar + editor view
- Notes load on mount
- Keyboard shortcuts active
- CSS styles applied
- Clean layout with no overflow issues

**Potential Issues**:
- CSS import order: Ensure base styles load before components
- Initial load: Notes should load before user interaction

---

### Task 2.14: Add Responsive Design and Polish
**File(s)**:
- Various component styles (modified)

**Estimated Time**: 30 minutes

**Actions**:
1. Add window resize handling to `src/renderer/components/Sidebar.svelte`:
   ```svelte
   <script lang="ts">
     import { onMount } from 'svelte';

     let windowWidth = window.innerWidth;

     onMount(() => {
       function handleResize() {
         windowWidth = window.innerWidth;
       }

       window.addEventListener('resize', handleResize);
       return () => window.removeEventListener('resize', handleResize);
     });

     // Auto-collapse sidebar on small screens
     $: if (windowWidth < 768) {
       // Consider adding auto-collapse logic
     }
   </script>
   ```

2. Add smooth transitions to components:
   ```css
   /* In Sidebar.svelte */
   .sidebar {
     transition: transform 0.3s ease-in-out;
   }

   /* In Editor.svelte */
   .editor-wrapper {
     transition: margin-left 0.3s ease-in-out;
   }
   ```

3. Add focus indicators for accessibility:
   ```css
   /* Global focus styles */
   :global(*:focus-visible) {
     outline: 2px solid #3b82f6;
     outline-offset: 2px;
   }
   ```

4. Ensure proper tab order and ARIA labels:
   ```svelte
   <!-- In buttons -->
   <button aria-label="Create new note" title="New Note (Cmd+N)">
   ```

**Success Criteria**:
- Smooth transitions between states
- Proper focus indicators
- Accessible keyboard navigation
- Responsive to window resize

**Potential Issues**:
- Performance: Transitions should not impact editor performance

---

### Task 2.15: Testing and Documentation
**File(s)**:
- `docs/PHASE_2_NOTES.md` (new)
- `README.md` (modified)

**Estimated Time**: 30 minutes

**Actions**:
1. Manual testing checklist:
   - [ ] Create new note with Cmd+N
   - [ ] Edit note title by clicking
   - [ ] Type in editor, verify auto-save
   - [ ] Apply formatting (bold, italic, headings, lists)
   - [ ] Search for notes
   - [ ] Delete note
   - [ ] Test all keyboard shortcuts
   - [ ] Switch between notes
   - [ ] Close and reopen app - data persists
   - [ ] Test with 50+ notes

2. Create `docs/PHASE_2_NOTES.md`:
   ```markdown
   # Phase 2: UI and Editor Integration Notes

   ## Completed Components

   ### UI Components
   - App.svelte: Root component with state management
   - Sidebar.svelte: Navigation and note list
   - NoteList.svelte: Filtered list of notes
   - NoteListItem.svelte: Individual note preview
   - SearchBar.svelte: Real-time search
   - Editor.svelte: TipTap rich text editor
   - EditorToolbar.svelte: Formatting controls
   - EditorView.svelte: Main editor view with header
   - EmptyState.svelte: Placeholder for no selection

   ### State Management
   - Zustand store for global state
   - Reactive updates across components
   - Optimistic UI updates

   ### Rich Text Editor
   - TipTap with StarterKit
   - Auto-save with debouncing (1 second)
   - Full formatting support
   - Undo/redo functionality
   - Placeholder text

   ### Keyboard Shortcuts
   - Cmd/Ctrl+N: New note
   - Cmd/Ctrl+S: Save (auto-save active)
   - Cmd/Ctrl+K: Focus search
   - Cmd/Ctrl+Shift+B: Toggle sidebar
   - All TipTap formatting shortcuts

   ## Architecture Decisions

   ### Why Zustand?
   - Lightweight (1KB)
   - Simple API
   - Works well with Svelte's reactivity
   - No boilerplate

   ### Why TipTap?
   - Headless (full styling control)
   - Extensible architecture
   - Built-in streaming support (for future AI features)
   - Active development

   ### Component Structure
   - Composition over inheritance
   - Single responsibility principle
   - Reusable, isolated components

   ## Known Limitations

   - No virtual scrolling yet (may be needed with 1000+ notes)
   - Search is client-side only (full-text search in Phase 4)
   - No real-time collaboration
   - No markdown export from editor

   ## Next Steps (Phase 3)
   - Implement filter system (YOUR CODE)
   - Add tag filtering UI
   - Date range filters
   - Advanced search with filters
   ```

3. Update README.md:
   ```markdown
   ## Progress

   - [x] Phase 0: Environment Setup
   - [x] Phase 1: Data Layer and CRUD Operations
   - [x] Phase 2: UI and Editor Integration
   - [ ] Phase 3: Filter System (Manual Implementation)
   ```

4. Create git commit:
   ```bash
   git add .
   git commit -m "feat: implement UI and TipTap editor integration

   Phase 2 complete:
   - Svelte component architecture (9 components)
   - Zustand state management
   - TipTap rich text editor with formatting
   - Auto-save with debouncing
   - Note list with search
   - Keyboard shortcuts (Cmd+N, Cmd+S, Cmd+K, Cmd+Shift+B)
   - Responsive design and accessibility
   - Professional styling

   Features:
   - Create, edit, delete notes from UI
   - Real-time search across notes
   - Rich text editing with toolbar
   - Click-to-edit note titles
   - Smooth transitions and interactions
   - Loading states and error handling

   Ready for Phase 3 (Filter System)"
   ```

**Success Criteria**:
- All manual tests pass
- Documentation complete
- Git commit with clear description
- No console errors or warnings

**Potential Issues**: None expected

---

## Integration Points

### From Phase 1:
- **IPC API**: All CRUD operations consumed via `window.electronAPI.notes.*`
- **Data Types**: `NoteWithContent` type used throughout UI
- **Database**: Transparent to UI - all data access via IPC

### For Phase 3 (Filter System):
- **Note List**: Will consume filter results
- **State Store**: Will add filter state
- **Components**: New filter UI components will integrate with existing sidebar

### Expected Exports from Phase 2:
- Complete note-taking UI
- State management infrastructure
- Reusable UI components
- Rich text editing capability
- Search functionality

---

## Testing Strategy

### Manual Testing Checklist:
- [ ] App launches and loads notes
- [ ] Sidebar shows all notes
- [ ] Can create new note with button
- [ ] Can create new note with Cmd+N
- [ ] Note title is editable (click to edit)
- [ ] Editor loads note content
- [ ] Can type in editor
- [ ] Formatting toolbar works (bold, italic, headings, lists, etc.)
- [ ] Auto-save indicator appears
- [ ] Changes persist after save
- [ ] Can switch between notes
- [ ] Search filters notes in real-time
- [ ] Can clear search with X button
- [ ] Can delete note
- [ ] Confirm dialog appears before delete
- [ ] Cmd+K focuses search
- [ ] Cmd+Shift+B toggles sidebar (if implemented)
- [ ] Close and reopen app - all data persists
- [ ] No console errors during normal use

### Performance Testing:
- [ ] Test with 100+ notes - no lag
- [ ] Typing in editor is responsive
- [ ] Search is instant
- [ ] Switching notes is smooth

### Accessibility Testing:
- [ ] Can navigate UI with Tab key
- [ ] Focus indicators visible
- [ ] Screen reader can read note titles
- [ ] Buttons have proper labels

---

## Potential Issues and Solutions

### Issue 1: Editor content not updating when switching notes
**Cause**: TipTap content not syncing with state changes
**Solution**:
```typescript
$: if (editor && currentNote) {
  const currentContent = editor.getHTML();
  if (currentContent !== currentNote.content) {
    editor.commands.setContent(currentNote.content);
  }
}
```

### Issue 2: Auto-save firing too frequently
**Cause**: Debounce delay too short
**Solution**: Increase debounce delay to 1-2 seconds

### Issue 3: Search is slow with many notes
**Cause**: Re-filtering on every keystroke
**Solution**: Add debouncing to search input (implement in Phase 4)

### Issue 4: Keyboard shortcuts not working
**Cause**: Event listener not attached or conflicts
**Solution**: Check `setupKeyboardShortcuts()` is called in `onMount`

### Issue 5: Styles not applied
**Cause**: CSS import missing or order incorrect
**Solution**: Ensure `import './app.css'` in index.ts before App import

### Issue 6: TipTap toolbar buttons not showing active state
**Cause**: Not subscribing to editor updates
**Solution**: Use reactive statements with `$:` to track editor state

### Issue 7: Note title doesn't save
**Cause**: Blur event not firing or update not called
**Solution**: Ensure `handleTitleBlur` properly calls `store.updateNote`

---

## Success Criteria

### Phase 2 Complete When:
1. ✅ All UI components built and integrated
2. ✅ TipTap editor fully functional
3. ✅ Auto-save working with debouncing
4. ✅ Note list displays and filters
5. ✅ Search functionality works
6. ✅ Keyboard shortcuts implemented
7. ✅ State management with Zustand
8. ✅ Professional styling applied
9. ✅ Responsive and accessible
10. ✅ All manual tests pass

### Deliverables:
- ✅ Functional note-taking UI
- ✅ Working rich text editor with formatting
- ✅ Note list with search
- ✅ Keyboard navigation
- ✅ Auto-save functionality
- ✅ Professional design
- ✅ Documentation

---

## Next Steps After Phase 2

Once Phase 2 is complete and verified:

1. **Review Svelte Patterns**: Understand how Svelte's reactivity works:
   - `$:` reactive statements
   - Component lifecycle (onMount, onDestroy)
   - Two-way binding with `bind:`
   - Event handling with `on:`

2. **Review TipTap Architecture**: Understand the editor:
   - Extension system
   - Commands API
   - Editor state management
   - How to add custom extensions (for AI streaming later)

3. **Prepare for Phase 3** (YOUR CODE):
   - Review filter requirements from project plan
   - Understand filter architecture (base class, registry)
   - Plan integration with existing UI

4. **Create Phase 3 Branch**:
   ```bash
   git checkout -b phase-3-filter-system
   ```

---

## Notes for Junior Developers

### Key Concepts to Understand:

1. **Svelte Reactivity**:
   - `$:` creates reactive statements that re-run when dependencies change
   - Store subscriptions with `$store` syntax
   - Two-way binding with `bind:value`

2. **Component Composition**:
   - Break UI into small, focused components
   - Pass data down via props
   - Pass events up via callbacks
   - Keep components pure and reusable

3. **State Management with Zustand**:
   - Single source of truth
   - Actions modify state immutably
   - Components subscribe to state changes
   - Better than prop drilling for global state

4. **TipTap Editor**:
   - Based on ProseMirror (powerful but complex)
   - TipTap provides simpler API
   - Extensions add functionality
   - Commands chain for complex operations

5. **Debouncing**:
   - Delay function execution until activity stops
   - Prevents excessive API calls
   - Important for performance with auto-save

### Common Mistakes to Avoid:
- ❌ Mutating state directly (use Zustand actions)
- ❌ Not cleaning up event listeners (memory leaks)
- ❌ Forgetting to destroy TipTap editor
- ❌ Over-nesting components (keep hierarchy flat)
- ❌ Not handling loading/error states
- ❌ Ignoring accessibility (keyboard nav, ARIA labels)

### Debugging Tips:
- Use Svelte DevTools browser extension
- Check Zustand state in console: `useNotesStore.getState()`
- Inspect TipTap state: `editor.getJSON()`
- Use React DevTools (works with Zustand)
- Check event listeners: `getEventListeners(element)` in console

### Resources:
- Svelte Tutorial: https://svelte.dev/tutorial
- TipTap Documentation: https://tiptap.dev/
- Zustand Guide: https://github.com/pmndrs/zustand
- ProseMirror Guide: https://prosemirror.net/docs/guide/
- Web Accessibility: https://www.w3.org/WAI/
