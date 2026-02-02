#!/bin/bash
# Auto-queue learnings when corrections are detected
# Creates entries that Claude will process into proper CLAUDE.md learnings

cd /Users/josh/code/crosswords 2>/dev/null || exit 0

QUEUE_FILE="/Users/josh/code/crosswords/.claude/learnings-queue.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Get context from git diff
CHANGED_FILES=$(git diff --name-only 2>/dev/null | head -5 | tr '\n' ', ')
DIFF_SNIPPET=$(git diff 2>/dev/null | head -30)

# Determine the type of correction
CORRECTION_TYPE="unknown"

# Check for various correction patterns
if echo "$DIFF_SNIPPET" | grep -qiE "^\-.*\S" && echo "$DIFF_SNIPPET" | grep -qiE "^\+.*\S"; then
    if echo "$DIFF_SNIPPET" | grep -qiE "(typo|spell)"; then
        CORRECTION_TYPE="typo"
    elif echo "$DIFF_SNIPPET" | grep -qiE "(import|require|from)"; then
        CORRECTION_TYPE="import-fix"
    elif echo "$DIFF_SNIPPET" | grep -qiE "(return|if|else|===|!==)"; then
        CORRECTION_TYPE="logic-fix"
    elif echo "$DIFF_SNIPPET" | grep -qiE "(const|let|var|function)"; then
        CORRECTION_TYPE="code-fix"
    else
        CORRECTION_TYPE="general-fix"
    fi
fi

# Only queue if there are actual changes
if [ -n "$CHANGED_FILES" ]; then
    # Create queue file if it doesn't exist
    if [ ! -f "$QUEUE_FILE" ]; then
        echo "# Pending Learnings Queue" > "$QUEUE_FILE"
        echo "" >> "$QUEUE_FILE"
        echo "> Claude: Process these into CLAUDE.md learnings, then clear this file." >> "$QUEUE_FILE"
        echo "" >> "$QUEUE_FILE"
    fi

    # Append the learning context
    cat >> "$QUEUE_FILE" << EOF

---
## Learning Queued: $TIMESTAMP
**Type:** $CORRECTION_TYPE
**Files:** $CHANGED_FILES

### Diff Context:
\`\`\`diff
$DIFF_SNIPPET
\`\`\`

**Suggested learning:** [Claude: Analyze the diff and write a specific, actionable rule]

EOF

    echo ""
    echo "📝 Learning queued to .claude/learnings-queue.md"
    echo "   I'll process this into CLAUDE.md automatically."
fi
