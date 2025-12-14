# Phase 0: Environment Setup and Initialization - Detailed Implementation Plan

**Objective**: Set up a working Electron + Svelte + Vite + TypeScript development environment with proper security configuration and a verified "Hello World" application.

**Duration**: 1-2 days
**Ownership**: 100% AI-generated

---

## Architecture Overview

Phase 0 establishes the foundational project structure for an Electron application with:
- **Main Process**: Node.js process managing app lifecycle and native OS integration
- **Renderer Process**: Chromium-based UI running Svelte components
- **Preload Script**: Secure IPC bridge between main and renderer processes
- **Build System**: Vite for fast HMR and TypeScript compilation

The architecture follows Electron's security best practices with context isolation and sandboxing enabled.

---

## Implementation Steps

### Task 0.1: Verify Development Environment Prerequisites
**File(s)**: None (system check)
**Estimated Time**: 15 minutes

**Actions**:
1. Check Node.js is installed (version 18.x or higher)
   - Run `node --version` in terminal
   - If not installed, download from https://nodejs.org/
2. Verify npm is available (comes with Node.js)
   - Run `npm --version` in terminal
3. Ensure git is installed for version control
   - Run `git --version` in terminal

**Success Criteria**:
- `node --version` returns v18.x or higher
- `npm --version` returns 9.x or higher
- `git --version` returns any version

**Potential Issues**:
- macOS users may need to install Xcode Command Line Tools
- Permission issues: may need to configure npm global directory

---

### Task 0.2: Initialize Project Directory and Git Repository
**File(s)**:
- `.gitignore`
- `README.md`

**Estimated Time**: 10 minutes

**Actions**:
1. Initialize git repository: `git init`
2. Create `.gitignore` file with the following content:
   ```
   node_modules/
   out/
   dist/
   .vite/
   .DS_Store
   *.log
   .env
   .env.local
   ```
3. Create basic `README.md` with project title and description

**Success Criteria**:
- `.git` folder exists in project root
- `.gitignore` file created with appropriate exclusions
- `README.md` exists

**Potential Issues**: None expected

---

### Task 0.3: Initialize Electron Forge Project with Vite + TypeScript Template
**File(s)**:
- `package.json`
- `forge.config.ts`
- `tsconfig.json`
- Initial project structure

**Estimated Time**: 20 minutes

**Actions**:
1. Run Electron Forge initialization command:
   ```bash
   npm init electron-app@latest . -- --template=vite-typescript
   ```
2. When prompted, confirm overwriting the current directory
3. Wait for dependencies to install
4. Review generated `package.json` for scripts and dependencies
5. Review `forge.config.ts` for build configuration
6. Review `tsconfig.json` for TypeScript compiler options

**Success Criteria**:
- `package.json` contains electron, @electron-forge packages
- `forge.config.ts` exists and contains Vite plugin configuration
- `tsconfig.json` exists with appropriate compiler options
- `node_modules/` directory populated with dependencies

**Potential Issues**:
- Network issues during npm install: retry with `npm install`
- Permission errors: may need to run with appropriate permissions

---

### Task 0.4: Configure Project Structure for Svelte Integration
**File(s)**:
- `package.json` (modified)
- `vite.renderer.config.ts` (new)
- `vite.main.config.ts` (modified)

**Estimated Time**: 25 minutes

**Actions**:
1. Install Svelte 5 and related dependencies:
   ```bash
   npm install svelte@5
   npm install --save-dev @sveltejs/vite-plugin-svelte svelte-check
   ```
2. Create `vite.renderer.config.ts` in project root:
   ```typescript
   import { defineConfig } from 'vite';
   import { svelte } from '@sveltejs/vite-plugin-svelte';

   export default defineConfig({
     plugins: [svelte()],
   });
   ```
3. Update `forge.config.ts` to reference the renderer config:
   - Modify the VitePlugin configuration to point to `vite.renderer.config.ts`
4. Verify `package.json` includes new dependencies

**Success Criteria**:
- `svelte` and `@sveltejs/vite-plugin-svelte` in `package.json` dependencies
- `vite.renderer.config.ts` exists with Svelte plugin configured
- `forge.config.ts` properly references renderer config

**Potential Issues**:
- Version conflicts between Svelte 5 and Vite: ensure latest versions
- TypeScript errors: may need to add Svelte type definitions

---

### Task 0.5: Create Main Process Entry Point
**File(s)**:
- `src/main.ts` (new/modified)

**Estimated Time**: 30 minutes

**Actions**:
1. Create or modify `src/main.ts` with the following structure:
   ```typescript
   import { app, BrowserWindow } from 'electron';
   import path from 'path';

   // Handle creating/removing shortcuts on Windows when installing/uninstalling
   if (require('electron-squirrel-startup')) {
     app.quit();
   }

   let mainWindow: BrowserWindow | null = null;

   const createWindow = (): void => {
     mainWindow = new BrowserWindow({
       width: 1200,
       height: 800,
       webPreferences: {
         preload: path.join(__dirname, 'preload.js'),
         contextIsolation: true,
         sandbox: true,
         nodeIntegration: false,
       },
     });

     // Load the index.html from the renderer
     if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
       mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
     } else {
       mainWindow.loadFile(
         path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
       );
     }

     // Open DevTools in development
     if (process.env.NODE_ENV === 'development') {
       mainWindow.webContents.openDevTools();
     }
   };

   app.on('ready', createWindow);

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') {
       app.quit();
     }
   });

   app.on('activate', () => {
     if (BrowserWindow.getAllWindows().length === 0) {
       createWindow();
     }
   });
   ```

2. Add TypeScript declaration for Electron Forge constants at top of file:
   ```typescript
   declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
   declare const MAIN_WINDOW_VITE_NAME: string;
   ```

**Success Criteria**:
- `src/main.ts` exists with proper BrowserWindow configuration
- Security options enabled: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Window lifecycle handlers implemented (ready, window-all-closed, activate)

**Potential Issues**:
- TypeScript errors for Electron constants: add declarations
- Path resolution issues: ensure correct relative paths for preload and renderer

---

### Task 0.6: Create Secure Preload Script
**File(s)**:
- `src/preload.ts` (new/modified)

**Estimated Time**: 20 minutes

**Actions**:
1. Create or modify `src/preload.ts`:
   ```typescript
   import { contextBridge, ipcRenderer } from 'electron';

   // Expose protected methods that allow the renderer process to use
   // ipcRenderer without exposing the entire object
   contextBridge.exposeInMainWorld('electronAPI', {
     // Example: send a message to main process
     sendMessage: (channel: string, data: any) => {
       // Whitelist channels
       const validChannels = ['toMain'];
       if (validChannels.includes(channel)) {
         ipcRenderer.send(channel, data);
       }
     },
     // Example: receive a message from main process
     onMessage: (channel: string, callback: (data: any) => void) => {
       const validChannels = ['fromMain'];
       if (validChannels.includes(channel)) {
         ipcRenderer.on(channel, (event, ...args) => callback(...args));
       }
     },
   });
   ```

2. Create TypeScript type definitions for the exposed API:
   - Create `src/preload.d.ts`:
   ```typescript
   export interface ElectronAPI {
     sendMessage: (channel: string, data: any) => void;
     onMessage: (channel: string, callback: (data: any) => void) => void;
   }

   declare global {
     interface Window {
       electronAPI: ElectronAPI;
     }
   }
   ```

**Success Criteria**:
- `src/preload.ts` uses `contextBridge` to expose secure API
- IPC channels are whitelisted (no unrestricted ipcRenderer access)
- TypeScript definitions exist for `window.electronAPI`

**Potential Issues**:
- Context isolation errors: ensure main.ts has `contextIsolation: true`
- TypeScript module resolution: may need to update tsconfig.json

---

### Task 0.7: Create Renderer Process Entry Point (HTML)
**File(s)**:
- `src/renderer/index.html` (new/modified)

**Estimated Time**: 15 minutes

**Actions**:
1. Create or modify `src/renderer/index.html`:
   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <meta http-equiv="Content-Security-Policy"
             content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
       <title>Radiant - AI-Powered Notes</title>
     </head>
     <body>
       <div id="app"></div>
       <script type="module" src="./index.ts"></script>
     </body>
   </html>
   ```

2. Ensure Content Security Policy (CSP) meta tag is present
3. Verify script tag points to TypeScript entry point

**Success Criteria**:
- `index.html` exists with minimal structure
- CSP meta tag configured for security
- Script tag loads `index.ts` as module
- Root `<div id="app">` exists for Svelte mounting

**Potential Issues**:
- CSP too restrictive: may need to adjust for development tools
- Path to index.ts incorrect: verify relative path

---

### Task 0.8: Create Renderer Process Entry Point (TypeScript + Svelte)
**File(s)**:
- `src/renderer/index.ts` (new/modified)
- `src/renderer/App.svelte` (new)

**Estimated Time**: 25 minutes

**Actions**:
1. Create or modify `src/renderer/index.ts`:
   ```typescript
   import App from './App.svelte';
   import './index.css';

   const app = new App({
     target: document.getElementById('app')!,
   });

   export default app;
   ```

2. Create `src/renderer/App.svelte`:
   ```svelte
   <script lang="ts">
     let message = 'Hello World from Radiant!';
     let count = 0;

     function incrementCount() {
       count++;
     }

     // Test IPC communication
     function testIPC() {
       if (window.electronAPI) {
         window.electronAPI.sendMessage('toMain', { test: 'Hello from renderer!' });
       }
     }
   </script>

   <main>
     <h1>{message}</h1>
     <p>Counter: {count}</p>
     <button on:click={incrementCount}>Increment</button>
     <button on:click={testIPC}>Test IPC</button>
   </main>

   <style>
     main {
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       height: 100vh;
       font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
     }

     h1 {
       color: #333;
       font-size: 2.5rem;
       margin-bottom: 1rem;
     }

     button {
       margin: 0.5rem;
       padding: 0.75rem 1.5rem;
       font-size: 1rem;
       border: none;
       border-radius: 4px;
       background-color: #007bff;
       color: white;
       cursor: pointer;
     }

     button:hover {
       background-color: #0056b3;
     }
   </style>
   ```

3. Create `src/renderer/index.css` (basic reset):
   ```css
   * {
     margin: 0;
     padding: 0;
     box-sizing: border-box;
   }

   body {
     overflow: hidden;
   }
   ```

**Success Criteria**:
- `index.ts` mounts Svelte App component to #app div
- `App.svelte` displays "Hello World" message
- Interactive button demonstrates reactivity
- IPC test button exists (may not work until Task 0.9)

**Potential Issues**:
- Svelte TypeScript support: ensure `lang="ts"` in script tag
- Missing Svelte type definitions: run `npm install --save-dev @types/svelte`

---

### Task 0.9: Implement Basic IPC Handler in Main Process
**File(s)**:
- `src/main.ts` (modified)

**Estimated Time**: 15 minutes

**Actions**:
1. Add IPC handler import to `src/main.ts`:
   ```typescript
   import { app, BrowserWindow, ipcMain } from 'electron';
   ```

2. Add IPC message handler before `createWindow()` function:
   ```typescript
   // Set up IPC handlers
   ipcMain.on('toMain', (event, data) => {
     console.log('Received from renderer:', data);

     // Send response back to renderer
     event.sender.send('fromMain', {
       response: 'Message received!',
       timestamp: Date.now()
     });
   });
   ```

3. Add listener in `App.svelte` to receive responses:
   ```typescript
   import { onMount } from 'svelte';

   onMount(() => {
     if (window.electronAPI) {
       window.electronAPI.onMessage('fromMain', (data) => {
         console.log('Received from main:', data);
       });
     }
   });
   ```

**Success Criteria**:
- Main process logs messages from renderer when "Test IPC" clicked
- Renderer console shows response from main process
- Bidirectional IPC communication verified

**Potential Issues**:
- IPC not working: verify preload script is loaded correctly
- Console not showing logs: open DevTools in development mode

---

### Task 0.10: Configure TypeScript Compilation Settings
**File(s)**:
- `tsconfig.json` (modified)

**Estimated Time**: 15 minutes

**Actions**:
1. Review and update `tsconfig.json` with recommended settings:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "lib": ["ES2020"],
       "skipLibCheck": true,
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true,
       "strict": true,
       "forceConsistentCasingInFileNames": true,
       "moduleResolution": "node",
       "resolveJsonModule": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true,
       "outDir": "./dist"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "out", "dist"]
   }
   ```

2. Verify TypeScript can compile without errors:
   ```bash
   npx tsc --noEmit
   ```

**Success Criteria**:
- TypeScript compilation succeeds with no errors
- Strict mode enabled for better type safety
- Source maps enabled for debugging

**Potential Issues**:
- Type errors in generated code: may need to add type definitions
- Module resolution issues: verify paths in tsconfig

---

### Task 0.11: Configure Development Hot Module Replacement (HMR)
**File(s)**:
- `vite.renderer.config.ts` (modified)
- `package.json` (verify scripts)

**Estimated Time**: 15 minutes

**Actions**:
1. Verify `vite.renderer.config.ts` has HMR configured:
   ```typescript
   import { defineConfig } from 'vite';
   import { svelte } from '@sveltejs/vite-plugin-svelte';

   export default defineConfig({
     plugins: [svelte()],
     server: {
       port: 5173,
       strictPort: true,
     },
   });
   ```

2. Ensure `package.json` has development script:
   ```json
   {
     "scripts": {
       "start": "electron-forge start",
       "package": "electron-forge package",
       "make": "electron-forge make"
     }
   }
   ```

3. Test HMR by running `npm start` and modifying `App.svelte`
4. Verify changes appear without full app restart

**Success Criteria**:
- `npm start` launches app successfully
- Changes to Svelte components trigger HMR
- Main process restarts when main.ts changes
- No full page refresh needed for renderer changes

**Potential Issues**:
- HMR not working: check Vite server is running on correct port
- Port conflicts: change port in vite config if 5173 is in use

---

### Task 0.12: Add Development Tooling Configuration
**File(s)**:
- `.prettierrc` (new)
- `.eslintrc.json` (new, optional)
- `package.json` (modified)

**Estimated Time**: 20 minutes

**Actions**:
1. Install Prettier for code formatting:
   ```bash
   npm install --save-dev prettier
   ```

2. Create `.prettierrc`:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "tabWidth": 2,
     "trailingComma": "es5",
     "printWidth": 80
   }
   ```

3. Add format script to `package.json`:
   ```json
   {
     "scripts": {
       "format": "prettier --write \"src/**/*.{ts,svelte,css,html}\""
     }
   }
   ```

4. Run initial format: `npm run format`

**Success Criteria**:
- Prettier installed and configured
- All source files formatted consistently
- Format script works without errors

**Potential Issues**:
- Svelte formatting issues: ensure Prettier Svelte plugin is installed
- Conflicts with editor settings: configure editor to use project Prettier

---

### Task 0.13: Create Initial Documentation
**File(s)**:
- `README.md` (modified)
- `DEVELOPMENT.md` (new)

**Estimated Time**: 20 minutes

**Actions**:
1. Update `README.md` with project overview:
   ```markdown
   # Radiant - AI-Powered Note-Taking App

   A lightweight Electron-based desktop application for capturing thoughts and generating AI-powered narratives.

   ## Tech Stack
   - Electron 39+
   - Svelte 5
   - TypeScript
   - Vite

   ## Quick Start
   \`\`\`bash
   npm install
   npm start
   \`\`\`

   ## Development
   See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development instructions.
   ```

2. Create `DEVELOPMENT.md`:
   ```markdown
   # Development Guide

   ## Prerequisites
   - Node.js 18.x or higher
   - npm 9.x or higher

   ## Installation
   \`\`\`bash
   npm install
   \`\`\`

   ## Running in Development
   \`\`\`bash
   npm start
   \`\`\`
   This starts the Electron app with hot module replacement.

   ## Project Structure
   - \`src/main.ts\` - Main process (Node.js)
   - \`src/preload.ts\` - Secure IPC bridge
   - \`src/renderer/\` - Renderer process (UI)
   - \`forge.config.ts\` - Electron Forge configuration
   - \`vite.renderer.config.ts\` - Vite configuration for renderer

   ## Building
   \`\`\`bash
   npm run package
   \`\`\`

   ## Code Formatting
   \`\`\`bash
   npm run format
   \`\`\`
   ```

**Success Criteria**:
- README.md provides high-level overview
- DEVELOPMENT.md contains setup and build instructions
- Both files use clear markdown formatting

**Potential Issues**: None expected

---

### Task 0.14: Test Application Launch and Verify All Features
**File(s)**: None (testing)
**Estimated Time**: 20 minutes

**Actions**:
1. Start the application: `npm start`
2. Verify window opens with "Hello World from Radiant!" message
3. Test counter button - verify number increments
4. Test IPC button:
   - Click "Test IPC" button
   - Open DevTools (should auto-open in dev mode)
   - Verify console logs in both main process and renderer
5. Test HMR:
   - Modify text in `App.svelte`
   - Verify changes appear without restarting app
6. Verify no console errors or warnings
7. Test window controls (minimize, maximize, close)
8. Test app quit behavior (Cmd+Q on macOS, Alt+F4 on Windows)

**Success Criteria**:
- Application launches without errors
- UI displays correctly with working buttons
- IPC communication verified in console logs
- HMR works for Svelte components
- Window controls function properly
- App quits cleanly

**Potential Issues**:
- Black screen on launch: check renderer process for errors
- IPC not working: verify preload script loaded
- HMR not working: check Vite dev server is running

---

### Task 0.15: Create Initial Git Commit
**File(s)**: All project files
**Estimated Time**: 10 minutes

**Actions**:
1. Review all changes: `git status`
2. Stage all files: `git add .`
3. Create initial commit:
   ```bash
   git commit -m "chore: initialize Electron + Svelte + Vite + TypeScript project

   - Configure Electron Forge with Vite template
   - Integrate Svelte 5 for UI
   - Set up secure IPC with context isolation
   - Configure TypeScript compilation
   - Add development tooling (Prettier)
   - Verify Hello World application launches

   Phase 0 complete: basic app structure ready for Phase 1"
   ```

**Success Criteria**:
- All project files committed to git
- Commit message clearly describes Phase 0 completion
- Repository in clean state (no uncommitted changes)

**Potential Issues**:
- Large files committed: verify .gitignore excludes node_modules

---

## Integration Points

### For Phase 1 (Data Layer):
- **IPC Bridge**: Phase 1 will extend the IPC API in preload.ts to expose database operations
- **Main Process**: Phase 1 will add database initialization in main.ts before window creation
- **Type Definitions**: Phase 1 will extend preload.d.ts with new API methods

### Expected Exports from Phase 0:
- Working Electron application shell
- Secure IPC communication channel
- TypeScript compilation pipeline
- Development environment with HMR
- Basic UI framework (Svelte) ready for components

---

## Testing Strategy

### Manual Testing Checklist:
- [ ] Application launches without errors
- [ ] Window displays "Hello World" message
- [ ] Counter button increments value
- [ ] IPC test button logs messages in console
- [ ] DevTools open in development mode
- [ ] HMR updates UI without restart
- [ ] Application quits cleanly
- [ ] No TypeScript compilation errors
- [ ] No console warnings or errors

### Automated Testing (Optional for Phase 0):
Not required for Phase 0, but consider adding in later phases:
- Unit tests for IPC handlers
- E2E tests with Playwright or Spectron

---

## Potential Issues and Solutions

### Issue 1: "Cannot find module 'electron'"
**Cause**: Electron not installed or corrupted node_modules
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: Vite dev server port conflict
**Cause**: Port 5173 already in use
**Solution**: Change port in `vite.renderer.config.ts`:
```typescript
server: {
  port: 5174, // or any available port
  strictPort: true,
}
```

### Issue 3: TypeScript errors about "window.electronAPI"
**Cause**: Missing type definitions
**Solution**: Ensure `preload.d.ts` is in `src/` directory and tsconfig.json includes it

### Issue 4: Context isolation errors
**Cause**: Trying to use Node.js APIs in renderer
**Solution**: All Node.js operations must go through IPC via preload script

### Issue 5: Black screen on app launch
**Cause**: Error in renderer process
**Solution**:
1. Open DevTools to see console errors
2. Check `index.html` and `index.ts` paths are correct
3. Verify Svelte compilation is working

### Issue 6: HMR not working
**Cause**: Vite dev server not running or misconfigured
**Solution**:
1. Check terminal for Vite server logs
2. Verify `vite.renderer.config.ts` is referenced in `forge.config.ts`
3. Restart development server: `npm start`

---

## Success Criteria

### Phase 0 Complete When:
1. ✅ Application launches and displays "Hello World"
2. ✅ TypeScript compiles without errors
3. ✅ IPC communication works bidirectionally
4. ✅ HMR updates renderer without full restart
5. ✅ Security settings configured (context isolation, sandbox)
6. ✅ Development tooling set up (Prettier, basic scripts)
7. ✅ Project structure organized and documented
8. ✅ Initial commit made to git repository

### Deliverables:
- ✅ Working Electron application executable
- ✅ Development environment with HMR
- ✅ TypeScript compilation pipeline
- ✅ Secure IPC bridge established
- ✅ Documentation (README.md, DEVELOPMENT.md)
- ✅ Code formatting configured
- ✅ Git repository initialized

---

## Next Steps After Phase 0

Once Phase 0 is complete and verified:

1. **Review Generated Code**: Spend 30-60 minutes reading through all files to understand:
   - Electron process model (main vs renderer)
   - Vite build configuration
   - TypeScript compilation pipeline
   - IPC security model

2. **Prepare for Phase 1**:
   - Review Phase 1 scope (database layer)
   - Understand what IPC handlers will be added
   - Familiarize yourself with better-sqlite3 documentation

3. **Create Phase 1 Branch** (optional):
   ```bash
   git checkout -b phase-1-data-layer
   ```

4. **Begin Phase 1 Implementation**:
   - Let AI generate database schema and CRUD operations
   - Review SQLite setup and IPC handlers
   - Test database operations before proceeding to Phase 2

---

## Notes for Junior Developers

### Key Concepts to Understand:
1. **Electron Process Model**:
   - Main process = Node.js (file system, OS access)
   - Renderer process = Chromium (UI, HTML, CSS, JS)
   - Preload script = secure bridge between the two

2. **Context Isolation**:
   - Renderer cannot access Node.js directly
   - Must use `contextBridge` in preload script
   - This prevents malicious code from accessing system

3. **IPC (Inter-Process Communication)**:
   - Renderer sends messages via `ipcRenderer.send()`
   - Main process listens via `ipcMain.on()`
   - Responses sent back via `event.sender.send()`

4. **Vite and HMR**:
   - Vite serves renderer files in development
   - Changes trigger hot module replacement
   - Main process changes require full restart

5. **TypeScript Benefits**:
   - Catch errors at compile time, not runtime
   - Better IDE autocomplete and documentation
   - Type definitions make IPC API explicit

### Common Mistakes to Avoid:
- ❌ Disabling security features (context isolation, sandbox)
- ❌ Using `nodeIntegration: true` (major security risk)
- ❌ Exposing entire ipcRenderer to renderer (use whitelist)
- ❌ Forgetting to call `event.preventDefault()` when needed
- ❌ Not handling errors in async IPC handlers

### Resources:
- Electron Documentation: https://www.electronjs.org/docs
- Svelte Tutorial: https://svelte.dev/tutorial
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Vite Guide: https://vitejs.dev/guide/
