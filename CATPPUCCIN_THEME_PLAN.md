# Catppuccin Theme Implementation Plan

## Overview
Add support for all 4 Catppuccin themes (Latte, Frappé, Macchiato, Mocha) with user-selectable theme switching.

## Current State
- Fixed light theme with hard-coded colors in component CSS
- No theme switching mechanism
- No user preferences storage
- TailwindCSS 4.x installed but not actively used
- Component-scoped CSS styling approach

## Catppuccin Flavors
1. **Latte** - Light theme (pastels on light background)
2. **Frappé** - Medium theme (warm palette)
3. **Macchiato** - Medium-dark theme (cooler palette)
4. **Mocha** - Dark theme (high contrast)

## Implementation Tasks

### Phase 1: Foundation (Database & Backend)

#### Task 1.1: Add Preferences Table
**File**: `src/database/migrations.ts`
- Add migration to create `preferences` table
- Schema: `(key TEXT PRIMARY KEY, value TEXT)`
- Store theme preference as JSON: `{"theme": "mocha"}`

#### Task 1.2: Create Preferences Repository
**File**: `src/database/preferencesRepository.ts` (new)
- `getPreference(key: string): string | null`
- `setPreference(key: string, value: string): void`
- `getAllPreferences(): Record<string, string>`

#### Task 1.3: Create Preferences Service
**File**: `src/services/preferencesService.ts` (new)
- `getTheme(): string` - Returns current theme (default: "mocha")
- `setTheme(theme: string): void` - Validates and saves theme

#### Task 1.4: Add IPC Handlers
**File**: `src/ipc/preferencesHandlers.ts` (new)
- Handler: `preferences:getTheme`
- Handler: `preferences:setTheme`
- Register handlers in main process

**File**: `src/preload.ts`
- Expose `electronAPI.getTheme()` and `electronAPI.setTheme(theme)`

---

### Phase 2: Theming System (CSS Variables)

#### Task 2.1: Define Catppuccin Color Palettes
**File**: `src/renderer/themes/catppuccin.ts` (new)
- Export color palettes for all 4 flavors
- Map semantic tokens (primary, background, text, etc.) to Catppuccin colors

Example structure:
```typescript
export const catppuccinThemes = {
  latte: {
    base: '#eff1f5',
    mantle: '#e6e9ef',
    crust: '#dce0e8',
    text: '#4c4f69',
    subtext0: '#6c6f85',
    // ... all colors
  },
  mocha: {
    base: '#1e1e2e',
    // ...
  }
}
```

#### Task 2.2: Create CSS Variable System
**File**: `src/renderer/themes/theme.css` (new)
- Define CSS custom properties for all semantic tokens:
  - `--color-base` (main background)
  - `--color-surface` (card/panel background)
  - `--color-text` (primary text)
  - `--color-subtext` (secondary text)
  - `--color-accent` (primary accent color)
  - `--color-border` (border color)
  - etc.
- Create class selectors for each theme: `.theme-latte`, `.theme-frappe`, etc.

#### Task 2.3: Create Theme Provider
**File**: `src/renderer/components/ThemeProvider.svelte` (new)
- Component that wraps the app
- Loads theme preference on mount via IPC
- Applies theme class to document root
- Provides theme context to children

---

### Phase 3: State Management & UI

#### Task 3.1: Extend Zustand Store for Theme
**File**: `src/renderer/stores/themeStore.ts` (new)
- State: `currentTheme: 'latte' | 'frappe' | 'macchiato' | 'mocha'`
- Action: `loadTheme()` - Fetch from IPC
- Action: `setTheme(theme)` - Update IPC and local state

#### Task 3.2: Refactor Components to Use CSS Variables
**Files to update**:
- `src/renderer/components/Sidebar.svelte`
- `src/renderer/components/EditorView.svelte`
- `src/renderer/components/EditorToolbar.svelte`
- `src/renderer/components/Editor.svelte`
- `src/renderer/app.css`

**Changes**:
- Replace hard-coded colors with CSS variables
- Example: `background-color: #ffffff` → `background-color: var(--color-base)`

#### Task 3.3: Create Theme Selector UI
**File**: `src/renderer/components/ThemeSelector.svelte` (new)
- Dropdown or radio buttons for theme selection
- Preview of each theme (optional)
- Connected to theme store
- Updates preference on change

**File**: `src/renderer/components/App.svelte`
- Add ThemeSelector to app (e.g., in a settings menu or toolbar)

---

### Phase 4: Integration & Polish

#### Task 4.1: Initialize Theme on App Start
**File**: `src/renderer.ts`
- Mount ThemeProvider before App component
- Ensure theme loads before UI renders

#### Task 4.2: Update TailwindCSS Config (Optional)
**File**: `tailwind.config.js`
- Consider integrating Catppuccin colors into Tailwind theme
- This allows using utilities like `bg-ctp-base` if preferred
- Reference: https://github.com/catppuccin/tailwindcss

#### Task 4.3: Testing & Refinement
- Test all 4 themes across all components
- Verify persistence (theme survives app restart)
- Check TipTap editor styling in all themes
- Ensure proper contrast for accessibility

---

## Architecture Decisions

### 1. Why CSS Variables?
- Allows runtime theme switching without recompiling
- Compatible with existing component-scoped CSS
- Minimal refactoring required
- Works seamlessly with Svelte reactivity

### 2. Why Not TailwindCSS Utilities?
- Current codebase doesn't use Tailwind classes
- Refactoring every component would be massive
- CSS variables provide better encapsulation
- Can add Tailwind integration later if desired

### 3. Theme Storage
- SQLite preferences table for persistence
- Zustand store for reactive UI state
- IPC bridge for main ↔ renderer communication
- Follows existing architectural patterns

### 4. Default Theme
- **Mocha** (dark) - Most popular Catppuccin flavor
- Can be changed to Latte if light theme preferred

---

## File Structure (New Files)

```
src/
├── database/
│   └── preferencesRepository.ts          [Task 1.2]
├── services/
│   └── preferencesService.ts             [Task 1.3]
├── ipc/
│   └── preferencesHandlers.ts            [Task 1.4]
└── renderer/
    ├── themes/
    │   ├── catppuccin.ts                 [Task 2.1]
    │   └── theme.css                     [Task 2.2]
    ├── stores/
    │   └── themeStore.ts                 [Task 3.1]
    └── components/
        ├── ThemeProvider.svelte          [Task 2.3]
        └── ThemeSelector.svelte          [Task 3.3]
```

---

## Dependencies
No new dependencies required! All can be implemented with existing stack.

Optional:
- `@catppuccin/tailwindcss` - If integrating with Tailwind utilities

---

## Estimated Complexity
- **Phase 1**: Medium (database schema changes, new repositories)
- **Phase 2**: Low (straightforward color definitions)
- **Phase 3**: High (requires refactoring multiple components)
- **Phase 4**: Low (integration and testing)

**Total**: 8-12 hours of development work

---

## Success Criteria
- [ ] All 4 Catppuccin themes are available
- [ ] User can switch themes via UI
- [ ] Theme preference persists across app restarts
- [ ] All components properly themed (no hard-coded colors remain)
- [ ] TipTap editor is readable in all themes
- [ ] No visual regressions

---

## References
- [Catppuccin Official Palette](https://github.com/catppuccin/catppuccin)
- [Catppuccin Color Values](https://github.com/catppuccin/catppuccin#-palette)
- [Catppuccin Tailwind Plugin](https://github.com/catppuccin/tailwindcss)
