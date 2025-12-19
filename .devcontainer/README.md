# Radiant Dev Container

This dev container provides a consistent development environment for the Radiant project, optimized for Claude Code mobile.

## What's Included

### Runtime & Tools
- **Node.js 22.x** (LTS) - JavaScript runtime
- **npm 10.x** - Package manager
- **Python 3.11** - Required for building native modules (better-sqlite3)
- **Git** - Version control
- **Build essentials** - C/C++ compilers for native dependencies

### VS Code Extensions
- Svelte for VS Code - Svelte language support
- ESLint - JavaScript/TypeScript linting
- Prettier - Code formatting
- Tailwind CSS IntelliSense - TailwindCSS support

### Pre-configured
- Auto-formatting on save
- ESLint integration
- Prettier as default formatter
- Port forwarding for Vite dev server (5173)

## First Time Setup

When you open this project in a dev container:

1. The container will build automatically
2. `npm install` runs automatically after creation
3. Dependencies including native modules (better-sqlite3) will compile

## Development Workflow

```bash
# Start the Electron app with hot reload
npm start

# Run linter
npm run lint

# Format code
npm run format

# Build application
npm run package

# Task management with bd
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress
bd close <id>
bd sync               # Sync with git
```

## Aliases Available

The container includes helpful aliases in `.bashrc`:

- `start` → `npm start`
- `lint` → `npm run lint`
- `format` → `npm run format`
- `build` → `npm run package`
- `bd-ready` → `bd ready`
- `bd-sync` → `bd sync`
- `gs` → `git status`
- `ga` → `git add`
- `gc` → `git commit`
- `gp` → `git push`

## Architecture Notes

This is an Electron application with:
- **Main process**: Node.js with database and file I/O access
- **Renderer process**: Svelte 5 UI in browser context
- **Dual storage**: SQLite for metadata + markdown files for content

The dev container is configured to handle:
- Native module compilation (better-sqlite3)
- TypeScript compilation
- Svelte component compilation
- TailwindCSS 4.x processing

## Troubleshooting

### Native module compilation fails
The container includes Python and build-essential tools. If compilation still fails:
```bash
npm rebuild better-sqlite3
```

### Port conflicts
The dev server uses port 5173. If it's already in use, stop other services or modify `vite.renderer.config.ts`.

### Permission issues
The container runs as user `node` (non-root) for security. All files should be accessible.

## Mobile Development Notes

This dev container is optimized for Claude Code mobile:
- Lightweight base image (Debian Bookworm)
- Only essential tools installed
- Quick startup time
- Pre-configured development commands
