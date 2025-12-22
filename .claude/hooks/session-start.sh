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

  # Try method 1: go install (fastest if it works)
  if go install github.com/steveyegge/beads/cmd/bd@latest 2>&1 | tee /tmp/bd-install.log | tail -5; then
    log "go install succeeded"
  else
    log "go install failed (network may be restricted), trying curl installer..."
    # Try method 2: official installer
    if curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash 2>&1 | tee -a /tmp/bd-install.log | tail -5; then
      log "curl installer succeeded"
    else
      log "Network installation failed - will create fallback wrapper"
    fi
  fi

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
  log "Could not install bd binary - creating fallback wrapper"

  # Create a wrapper script that provides basic bd functionality
  # This works with the no-db mode using issues.jsonl
  cat > /root/.local/bin/bd << 'EOFBD'
#!/bin/bash
# Fallback bd wrapper - limited functionality when full bd binary unavailable

BEADS_DIR=".beads"
ISSUES_FILE="$BEADS_DIR/issues.jsonl"

if [ ! -f "$ISSUES_FILE" ]; then
  echo "Error: bd command not available and no $ISSUES_FILE found"
  echo ""
  echo "The bd (beads) issue tracker could not be installed due to network restrictions."
  echo "To install bd manually, run:"
  echo "  go install github.com/steveyegge/beads/cmd/bd@latest"
  echo "  ln -sf \$HOME/go/bin/bd /root/.local/bin/bd"
  exit 1
fi

case "$1" in
  ready)
    echo "Available issues (ready to work on):"
    echo ""
    node -e "
      const fs = require('fs');
      const lines = fs.readFileSync('$ISSUES_FILE', 'utf8').trim().split('\n');
      const issues = lines.map(l => JSON.parse(l)).filter(i => i.status === 'ready');
      if (issues.length === 0) {
        console.log('  No ready issues found.');
      } else {
        issues.forEach(i => {
          console.log(\`  [\${i.id}] \${i.status} - \${i.title}\`);
        });
      }
    " 2>/dev/null || echo "  (Install full bd for issue listing)"
    ;;
  show)
    if [ -z "$2" ]; then
      echo "Usage: bd show <issue-id>"
      exit 1
    fi
    node -e "
      const fs = require('fs');
      const id = process.argv[1];
      const lines = fs.readFileSync('$ISSUES_FILE', 'utf8').trim().split('\n');
      const issue = lines.map(l => JSON.parse(l)).find(i => i.id === id);
      if (!issue) {
        console.log('Issue not found: ' + id);
      } else {
        console.log('ID: ' + issue.id);
        console.log('Title: ' + issue.title);
        console.log('Status: ' + issue.status);
        console.log('Description: ' + (issue.description || '(none)'));
      }
    " "$2" 2>/dev/null || echo "Error reading issue"
    ;;
  sync|update|close|create)
    echo "Command '$1' requires full bd installation"
    echo ""
    echo "To install bd:"
    echo "  go install github.com/steveyegge/beads/cmd/bd@latest"
    echo "  ln -sf \$HOME/go/bin/bd /root/.local/bin/bd"
    exit 1
    ;;
  --version|-v)
    echo "bd fallback wrapper v1.0 (limited functionality)"
    echo "Install full bd: go install github.com/steveyegge/beads/cmd/bd@latest"
    ;;
  *)
    echo "bd (beads) issue tracker - limited fallback mode"
    echo ""
    echo "Available commands:"
    echo "  bd ready       - Show ready issues"
    echo "  bd show <id>   - Show issue details"
    echo ""
    echo "Full bd installation required for: update, close, create, sync"
    echo ""
    echo "To install full bd:"
    echo "  go install github.com/steveyegge/beads/cmd/bd@latest"
    echo "  ln -sf \$HOME/go/bin/bd /root/.local/bin/bd"
    ;;
esac
EOFBD
  chmod +x /root/.local/bin/bd
  log "Created fallback bd wrapper at /root/.local/bin/bd"
  log "Limited functionality: 'bd ready' and 'bd show' only"
  log "To install full bd later: go install github.com/steveyegge/beads/cmd/bd@latest"
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
