#!/bin/bash
# Check if user input contains correction-related keywords
# Used by UserPromptSubmit hook to remind Claude to learn from mistakes

INPUT="$1"

# Keywords that suggest a correction is happening
CORRECTION_PATTERNS="wrong|mistake|error|fix|incorrect|don't|shouldn't|wasn't|broken|bug|issue|failed|doesn't work|not working|that's not|no,|nope|actually"

if echo "$INPUT" | grep -qiE "$CORRECTION_PATTERNS"; then
    echo ""
    echo "---"
    echo "LEARNING REMINDER: This looks like a correction. After fixing, consider:"
    echo "1. Run /learn to add this to CLAUDE.md"
    echo "2. Or say: 'Update CLAUDE.md so you don't make that mistake again'"
    echo "---"
fi
