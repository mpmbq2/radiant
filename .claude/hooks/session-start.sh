#!/bin/bash
set -euo pipefail

# Log function for SessionStart hook
log() {
  echo "[SessionStart] $*" >&2
}

log "Initializing Radiant development environment..."

# Only run setup in remote (web) environments
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  log "Skipping setup (running in local environment)"
  exit 0
fi

# 1. Install Beads (bd) CLI tool for issue tracking
# First check if bd binary exists anywhere
bd_binary=""
for bd_path in "/root/.local/bin/bd" "$HOME/go/bin/bd" "/root/go/bin/bd"; do
  if [ -f "$bd_path" ] || [ -L "$bd_path" ]; then
    bd_binary="$bd_path"
    break
  fi
done

if [ -z "$bd_binary" ]; then
  log "Installing Beads (bd) CLI tool..."
  # Install beads via the official installer (ignore errors as we verify below)
  curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash 2>&1 | tail -5 || true

  # Find where bd was installed
  for bd_path in "$HOME/go/bin/bd" "/root/go/bin/bd"; do
    if [ -f "$bd_path" ]; then
      bd_binary="$bd_path"
      break
    fi
  done
fi

# Ensure bd is accessible via /root/.local/bin symlink
if [ -n "$bd_binary" ]; then
  if [ ! -L /root/.local/bin/bd ] && [ "$bd_binary" != "/root/.local/bin/bd" ]; then
    log "Creating symlink /root/.local/bin/bd -> $bd_binary"
    mkdir -p /root/.local/bin
    ln -sf "$bd_binary" /root/.local/bin/bd
  fi

  # Verify bd is now accessible
  if command -v bd &> /dev/null; then
    log "Beads available: $(bd --version 2>/dev/null || echo 'version unknown')"
  else
    log "Warning: bd binary exists at $bd_binary but not in PATH"
  fi
else
  log "Warning: Could not install or find bd binary"
fi

# 2. Install npm dependencies
if [ -f "package.json" ]; then
  log "Installing npm dependencies..."
  # Use npm ci if package-lock.json exists for faster, deterministic installs
  if [ -f "package-lock.json" ]; then
    npm ci --prefer-offline --no-audit 2>&1 | tail -10
  else
    npm install --prefer-offline --no-audit 2>&1 | tail -10
  fi
  log "npm dependencies installed successfully"
fi

# 3. Set up persistent environment variables for the session
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  cat >> "$CLAUDE_ENV_FILE" << 'EOF'
export NODE_ENV=development
export PYTHONDONTWRITEBYTECODE=1
export PYTHONUNBUFFERED=1
EOF
  log "Environment variables persisted to CLAUDE_ENV_FILE"
fi

# 4. Display context information for Claude
log "Environment setup complete. Current status:"
echo ""
echo "🎨 Radiant Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Node.js: $(node --version)"
echo "📦 npm: $(npm --version)"
if command -v bd &> /dev/null; then
  echo "📋 Beads: $(bd --version 2>/dev/null || echo 'installed')"
fi
echo ""
echo "📂 Project: Radiant (Electron + Svelte 5 + TypeScript)"
echo "🗄️  Architecture: Dual-storage (SQLite + Markdown)"
echo ""
echo "🚀 Quick commands:"
echo "  npm start      - Start development server with hot reload"
echo "  npm run lint   - Run ESLint"
echo "  npm run format - Format code with Prettier"
echo "  npm run build  - Build application"
echo "  bd ready       - Find available issues"
echo "  bd sync        - Sync issues with git"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show git status
log "Git status:"
git status --short || true

# Show available issues if beads is installed
if command -v bd &> /dev/null; then
  echo ""
  log "Available issues:"
  bd ready 2>/dev/null || echo "  No ready issues found. Use 'bd' to manage issues."
fi

log "Session initialization complete!"
exit 0
