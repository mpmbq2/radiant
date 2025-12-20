# Claude Code Configuration

This directory contains Claude Code configuration for the Radiant project, including SessionStart hooks for automated environment setup.

## SessionStart Hooks

SessionStart hooks automatically set up the development environment when starting a Claude Code web session.

### What Gets Installed

When you start a Claude Code web session, the SessionStart hook automatically:

1. **Installs Beads (bd)** - Git-native issue tracking CLI tool
2. **Installs npm dependencies** - All project dependencies including native modules (better-sqlite3)
3. **Sets up environment variables** - Development environment configuration
4. **Displays context** - Shows git status and available issues

### Files

- **`settings.json`** - Claude Code settings with SessionStart hook configuration
- **`hooks/session-start.sh`** - Bash script that runs on session start

### How It Works

The hook is configured in `settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-start.sh"
          }
        ]
      }
    ]
  }
}
```

### Environment Detection

The hook only runs in Claude Code web environments (`CLAUDE_CODE_REMOTE=true`). It skips setup when running locally to avoid unnecessary installations.

### Manual Testing

To test the hook script manually:

```bash
# Test locally (will skip installation)
bash .claude/hooks/session-start.sh

# Test as if in web environment
CLAUDE_CODE_REMOTE=true bash .claude/hooks/session-start.sh
```

### Environment Variables

The hook sets up persistent environment variables for the session:

- `NODE_ENV=development` - Sets Node.js environment to development
- `PATH` - Adds beads installation directories (`$HOME/go/bin`, `/root/go/bin`) to PATH
- `BASH_ENV` - Points to `~/.local/bin/env` to ensure PATH is available in non-interactive shells
- `PYTHONDONTWRITEBYTECODE=1` - Prevents Python bytecode generation
- `PYTHONUNBUFFERED=1` - Enables unbuffered Python output

**PATH Persistence:** The hook uses two mechanisms to ensure the `bd` command is available:
1. Updates `~/.local/bin/env` with Go bin paths (sourced by `.profile`)
2. Sets `BASH_ENV=$HOME/.local/bin/env` so non-interactive shells also get the correct PATH

### Output

When the hook runs successfully, you'll see output like:

```
🎨 Radiant Development Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Node.js: v22.x.x
📦 npm: 10.x.x
📋 Beads: v0.30.6

📂 Project: Radiant (Electron + Svelte 5 + TypeScript)
🗄️  Architecture: Dual-storage (SQLite + Markdown)

🚀 Quick commands:
  npm start      - Start development server with hot reload
  npm run lint   - Run ESLint
  npm run format - Format code with Prettier
  npm run build  - Build application
  bd ready       - Find available issues
  bd sync        - Sync issues with git
```

### Troubleshooting

**If beads doesn't install:**
- Check that Go is available in the environment
- The script will attempt to install via GitHub releases or `go install`
- Beads may be installed in `$HOME/go/bin` or `/root/go/bin`

**If `bd` command is not found after installation:**
- Verify `bd` binary exists: `ls -la ~/go/bin/bd /root/go/bin/bd`
- Check PATH in login shell: `bash --login -c 'echo $PATH'`
- Ensure `~/.local/bin/env` contains Go bin paths
- Ensure `~/.profile` exports `BASH_ENV="$HOME/.local/bin/env"`
- Restart your Claude Code session to pick up the new environment variables

**If npm install fails:**
- Check that Node.js is available
- Verify `package.json` and `package-lock.json` exist
- Native modules (better-sqlite3) require Python and build tools

**Hook doesn't run:**
- Verify `.claude/settings.json` exists and is valid JSON
- Check that the hook script is executable: `chmod +x .claude/hooks/session-start.sh`
- Ensure you're in a trusted workspace

### Related Files

- **`.devcontainer/`** - Dev container configuration (mirrors this setup)
- **`CLAUDE.md`** - Project instructions for Claude Code
- **`AGENTS.md`** - Agent workflow documentation

### Resources

- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks)
- [Beads Issue Tracker](https://github.com/steveyegge/beads)
- [Electron Documentation](https://www.electronjs.org/docs)
