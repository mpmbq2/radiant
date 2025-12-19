# AI-Powered Note-Taking App: Project Plan

**Project Vision**: Build a lightweight Electron app that serves as a "second brain" - a personal writing space where professionals dump thoughts throughout the day, with an AI agent that curates these writings into narratives and provides intelligent retrieval and reminders.

**Development Philosophy**: AI handles scaffolding and boilerplate; you code the architecturally interesting systems that map to your Python expertise and teach JavaScript fundamentals.

---

## Technology Stack Decisions

### Core Framework
- **Electron 39+** - Desktop application framework
- **Svelte 5** - UI framework (chosen for minimal bundle size and simplicity)
- **TypeScript** - Type safety and better DX
- **Vite** - Build tool and dev server

### Key Libraries
- **TipTap** - Rich text editor with native AI streaming support
- **better-sqlite3** - Local database for metadata and search
- **MiniSearch** - Full-text search (with future semantic search option)
- **Zustand** - Lightweight state management
- **Ollama** - Local LLM for routine tasks (categorization, extraction)
- **Anthropic Claude API** - Cloud LLM for narrative synthesis

### Development Tools
- **Electron Forge** - Build and packaging
- **electron-builder** - Distribution and auto-updates
- **Cursor/Claude** - AI coding assistant for scaffolding

---

## Project Phases

### Phase 0: Environment Setup and Initialization

**Scope:**
- Install Node.js, npm, and development tools
- Initialize Electron + Svelte + Vite + TypeScript project using Electron Forge
- Configure build system (Vite config, tsconfig, package.json scripts)
- Set up basic Electron security (contextIsolation, sandbox, preload script)
- Create initial project structure (src/main, src/renderer, src/preload)
- Configure development hot reload
- Verify the app launches and displays "Hello World"

**Deliverables:**
- Working Electron application that opens a window
- Development environment with HMR
- TypeScript compilation working
- Basic IPC bridge established

**Dependencies**: None

---

### Phase 1: Core Data Layer and CRUD Operations

**Scope:**
- Design SQLite schema for notes (id, title, content, created_at, modified_at, tags)
- Implement database connection with better-sqlite3 in main process
- Configure WAL mode and performance optimizations
- Create CRUD operations (create, read, update, delete notes)
- Implement file-based storage (Markdown files with YAML frontmatter)
- Build IPC handlers for database operations
- Expose typed API through preload script
- Add basic error handling and logging

**Deliverables:**
- Functioning database layer
- File system integration for Markdown storage
- IPC API for note operations exposed to renderer
- Basic data persistence working

**Dependencies**: Phase 0

**Learning note**: You'll review this code to understand async/await patterns and IPC architecture, but won't write it yourself.

---

### Phase 2: Basic UI and Editor Integration

**Scope:**
- Create Svelte component structure (App, NoteList, Editor, Sidebar)
- Integrate TipTap editor with Svelte
- Configure TipTap with StarterKit (basic formatting, markdown support)
- Build note list view with search/filter UI elements
- Implement basic routing/navigation between notes
- Add keyboard shortcuts (Cmd/Ctrl+N for new note, Cmd/Ctrl+S for save)
- Style with Tailwind CSS or minimal custom CSS
- Connect UI to IPC API from Phase 1

**Deliverables:**
- Functional note-taking UI
- Working rich text editor
- Note list with selection
- Basic styling and layout

**Dependencies**: Phase 1

**Learning note**: You'll review Svelte syntax and component patterns, but won't write this yourself yet.

---

### Phase 3: Note Filter System (YOUR CODE)

**Scope:**
- Design and implement FilterInterface base class
- Create FilterRegistry for dynamic filter registration
- Implement concrete filter types:
  - TagFilter (notes with specific tags)
  - DateRangeFilter (notes within date range)
  - ContentFilter (notes containing text)
  - AuthorFilter (if multi-user support later)
  - CompositeFilter (AND/OR combinations)
- Build filter configuration system (YAML or JSON-based)
- Add filter serialization/deserialization
- Create unit tests for filter system
- Build simple UI component to display/apply filters

**Deliverables:**
- Complete filter architecture matching your Python config-driven analysis pattern
- Working registry system
- 5-7 concrete filter implementations
- Filter composition capability
- Configuration-driven filtering

**Dependencies**: Phase 2

**Learning Objectives:**
- ES6 class syntax and inheritance
- JavaScript modules (import/export)
- Array methods (filter, map, reduce)
- Object destructuring and spreading
- Map/Set data structures
- Optional: Basic Jest testing

---

### Phase 4: Search Implementation

**AI-Generated (Day 1-2):**
- Integrate MiniSearch library
- Implement basic full-text indexing of notes
- Create search UI component (search bar, results display)
- Add search-as-you-type with debouncing
- Implement result highlighting

**Your Code (Day 2-3):**
- Design SearchProvider interface/abstract class
- Implement MiniSearchProvider as concrete implementation
- Create SearchFactory for provider instantiation
- Build search configuration system
- Add provider-agnostic search API to IPC layer
- Structure code to allow future VectorSearchProvider drop-in

**Deliverables:**
- Working full-text search
- Extensible search architecture
- Provider pattern for swappable search backends

**Dependencies**: Phase 2, Phase 3

**Learning Objectives:**
- Interface design in TypeScript
- Factory pattern in JavaScript
- Working with third-party libraries
- Dependency injection concepts

---

### Phase 5: AI Infrastructure Setup

**AI-Generated (Day 1-2):**
- Set up Anthropic SDK and API client
- Create secure API key storage (electron-store or system keychain)
- Implement streaming response handler with IPC bridging
- Build UI components for streaming text display
- Add loading states and error handling
- Optional: Set up local Ollama integration
- Create background worker window for scheduled tasks

**Your Code (Day 2-3):**
- Write a simple test prompt to verify streaming works
- Implement single-call narrative generation (pass note text, get summary back)
- Connect to TipTap's streamContent command
- Test end-to-end AI integration with a hardcoded prompt

**Deliverables:**
- Working AI API client with streaming support
- Secure credential management
- Background processing capability
- Basic AI integration working with the editor

**Dependencies**: Phase 2

**Learning Objectives:**
- Async/await and Promise handling
- Stream processing in JavaScript
- IPC patterns for long-running operations
- API client architecture

---

### Phase 6: AI Prompt Strategy System (YOUR CODE)

**Scope:**
- Design PromptStrategy base class with template method pattern
- Create PromptRegistry for dynamic strategy registration
- Implement concrete prompt strategies:
  - DailySummaryStrategy (end-of-day narrative)
  - WeeklySynthesisStrategy (week-in-review)
  - MorningBriefingStrategy (today's reminders + forgotten items)
  - YearEndReviewStrategy (annual accomplishment summary)
  - ActionItemExtractionStrategy (LLM-based, not regex)
  - TopicClusteringStrategy (identify recurring themes)
- Build prompt template system with variable substitution
- Add context injection (previous summaries, user preferences)
- Create configuration format for prompts (YAML/JSON)
- Implement prompt versioning (iterate on prompts over time)

**Deliverables:**
- Complete prompt architecture with strategy pattern
- 5-6 production-ready prompt strategies
- Configuration-driven prompt system
- Context management for multi-turn narratives

**Dependencies**: Phase 5

**Learning Objectives:**
- Template literals and string interpolation
- Async function composition
- Strategy pattern in JavaScript
- Object spreading and merging
- Error handling in async code

---

### Phase 7: Automated Narrative Generation

**AI-Generated (Day 1-2):**
- Integrate node-cron for scheduled tasks
- Set up daily task runner (runs at 11 PM)
- Implement notification system (native OS notifications)
- Create summary storage (separate table for generated narratives)
- Build UI for viewing past summaries

**Your Code (Day 2-4):**
- Design narrative state machine (raw notes → daily → weekly → monthly)
- Implement incremental summarization logic
  - Day 1-7: individual daily summaries
  - Week end: synthesize 7 daily summaries into weekly
  - Month end: synthesize 4-5 weekly summaries into monthly
- Build dependency tracking (weekly depends on all dailies existing)
- Add cache invalidation (regenerate if source notes change)
- Implement "regenerate summary" functionality

**Deliverables:**
- Automated daily narrative generation
- Multi-tier summarization system
- State machine for narrative lifecycle
- Background processing without blocking UI

**Dependencies**: Phase 6

**Learning Objectives:**
- State machines in JavaScript
- Asynchronous task scheduling
- Complex data dependencies
- Caching strategies

---

### Phase 8: Polish and Production Features

**AI-Generated:**
- Implement auto-save (debounced, saves every 30 seconds or on blur)
- Add export functionality (export notes as Markdown, PDF, or JSON)
- Build settings panel (user preferences, API keys, theme)
- Implement keyboard shortcut system (customizable shortcuts)
- Add undo/redo support
- Create onboarding flow for first-time users
- Build backup system (automatic local backups)
- Add data migration utilities

**Your Testing:**
- Test all features thoroughly
- Identify edge cases and bugs
- Provide feedback for AI to fix issues

**Deliverables:**
- Production-ready feature set
- User settings and preferences
- Data safety features (backups, exports)
- Polished UX

**Dependencies**: Phase 7

---

### Phase 9: Distribution and Deployment

**Scope:**
- Configure electron-builder for production builds
- Set up code signing (macOS and Windows certificates)
- Implement auto-update mechanism (electron-updater)
- Create installers (DMG for macOS, NSIS for Windows, AppImage for Linux)
- Build CI/CD pipeline (GitHub Actions for automated builds)
- Create release process documentation
- Generate privacy policy and terms (if publishing)

**Deliverables:**
- Signed, distributable application packages
- Auto-update infrastructure
- Release automation

**Dependencies**: Phase 8

---

## Optional Future Enhancements

### Phase 10: Semantic Search (Future)
**Ownership**: Split - AI generates vector DB integration, you extend SearchProvider

**Scope:**
- Integrate Vectra or LanceDB for vector storage
- Generate embeddings for notes (using OpenAI or local model)
- Implement VectorSearchProvider following SearchProvider interface
- Add hybrid search (combine full-text + semantic results)
- Build "similar notes" feature
- Create embedding cache to avoid regeneration

### Phase 11: Multi-Device Sync (Future)

**Scope:**
- Implement Yjs CRDT for conflict-free merging
- Add sync provider (WebRTC peer-to-peer or cloud sync)
- Build conflict resolution UI
- Add offline-first sync queue

### Phase 12: Collaboration Features (Future)

**Scope:**
- Shared notebooks with permissions
- Real-time collaborative editing
- Comment threads on notes
- Activity feed

---

## Development Workflow Guidelines

### For AI-Generated Code
1. **Be specific in prompts**: Include exact libraries, patterns, and constraints
2. **Request inline documentation**: Every function should have JSDoc comments
3. **Ask for TypeScript types**: Full type coverage for learning purposes
4. **Generate tests**: Ask for unit tests using Jest where appropriate
5. **Review thoroughly**: Read all AI-generated code before proceeding

---

## Success Metrics

### Technical Milestones
- [ ] App launches and displays notes
- [ ] Notes persist across app restarts
- [ ] Search returns relevant results
- [ ] AI generates coherent daily summaries
- [ ] Filters work with complex combinations
- [ ] Prompt strategies produce different narrative styles
- [ ] Multi-tier summarization (daily → weekly → monthly) works
- [ ] App packages and installs on macOS/Windows

---

## Risk Management

### Technical Risks
- **AI API costs exceed budget**: Mitigation: use local models for most operations, cache aggressively
- **Electron app size too large**: Mitigation: lazy load modules, exclude unnecessary dependencies
- **Performance degrades with many notes**: Mitigation: implement pagination, virtual scrolling
- **Prompt strategies don't produce quality narratives**: Mitigation: build feedback mechanism, iterate prompts

---

## Next Steps

1. **Review and approve this plan**: Make sure the phase breakdown and ownership split makes sense
2. **Set up development environment**: Install required tools (Node.js, IDE, etc.)
3. **Execute Phase 0**: Generate the Electron skeleton using AI
4. **Review generated code**: Spend time understanding the project structure
5. **Begin Phase 1**: Let AI build the data layer while you study the architecture
6. **Start learning**: When you reach Phase 3, you'll begin writing JavaScript yourself

---

## Notes and Considerations

- **Code ownership**: Even for AI-generated phases, you'll review and understand the code
- **Flexibility**: If a phase proves more complex than expected, it can be split into sub-phases
- **Iteration**: Later phases may require revisiting earlier code - this is expected and healthy
- **Documentation**: Maintain a personal "JavaScript learnings" document throughout
- **Testing strategy**: AI-generated code should include tests; your code should too
- **Version control**: Commit after each phase completion with clear commit messages

This is a living document - adjust timelines and scope as you learn what works best for your learning style and schedule.
