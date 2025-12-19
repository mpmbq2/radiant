# Radiant Dev Container Bash Configuration

# Source the default bashrc if it exists
if [ -f /etc/bash.bashrc ]; then
    . /etc/bash.bashrc
fi

# Aliases for common tasks
alias start='npm start'
alias lint='npm run lint'
alias format='npm run format'
alias build='npm run package'

# bd/beads shortcuts
alias bd-ready='bd ready'
alias bd-sync='bd sync'

# Git shortcuts
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline -10'

# Environment
export NODE_ENV=development

# Show helpful info on login
echo "🎨 Radiant Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Node.js: $(node --version)"
echo "📦 npm: $(npm --version)"
echo ""
echo "🚀 Quick commands:"
echo "  npm start     - Start development server"
echo "  npm run lint  - Run linter"
echo "  npm run format - Format code"
echo "  bd ready      - Find available work"
echo "  bd sync       - Sync with git"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
