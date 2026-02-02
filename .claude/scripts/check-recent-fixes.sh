#!/bin/bash
# Check if recent edits look like fixes/corrections
# Runs as a Stop hook to remind about learning opportunities

cd /Users/josh/code/crosswords 2>/dev/null || exit 0

# Check git diff for patterns suggesting fixes
DIFF_OUTPUT=$(git diff --cached --name-only 2>/dev/null || git diff --name-only 2>/dev/null)

if [ -z "$DIFF_OUTPUT" ]; then
    exit 0
fi

# Check if any modified files have "fix" related changes
FIX_PATTERNS=$(git diff 2>/dev/null | grep -iE "^\+.*\b(fix|revert|correct|typo|bug|oops|wrong)\b" | head -3)

if [ -n "$FIX_PATTERNS" ]; then
    echo ""
    echo "---"
    echo "LEARNING OPPORTUNITY DETECTED"
    echo "Recent changes look like fixes. Consider running /learn to capture this lesson."
    echo "---"
fi
