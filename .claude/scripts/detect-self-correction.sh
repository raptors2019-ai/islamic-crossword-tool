#!/bin/bash
# Detect self-corrections: when Claude edits something it just wrote
# Triggers learning reminder for BOTH user-called-out AND self-discovered mistakes

cd /Users/josh/code/crosswords 2>/dev/null || exit 0

LEARNING_DETECTED=false
REASON=""

# ============================================================================
# CHECK 1: Recently modified files being re-edited (self-correction pattern)
# If a file was modified in the last 3 minutes and is being edited again,
# it's likely Claude correcting its own recent work
# ============================================================================
for file in $(git diff --name-only 2>/dev/null); do
    if [ -f "$file" ]; then
        # Get file's last modification time
        MOD_TIME=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null)
        NOW=$(date +%s)
        AGE=$((NOW - MOD_TIME))

        # If file was modified less than 180 seconds (3 min) ago, likely self-correction
        if [ "$AGE" -lt 180 ]; then
            LEARNING_DETECTED=true
            REASON="Re-editing recently modified file: $file"
            break
        fi
    fi
done

# ============================================================================
# CHECK 2: Diff contains self-correction language patterns
# Claude often writes comments or changes that include these phrases
# ============================================================================
if [ "$LEARNING_DETECTED" = false ]; then
    DIFF_CONTENT=$(git diff 2>/dev/null)

    # Patterns that suggest fixing/correcting
    SELF_CORRECT_PATTERNS="actually|oops|mistake|should be|should have|was wrong|incorrect|fix|typo|forgot|missing|needed|broken|bug"

    if echo "$DIFF_CONTENT" | grep -qiE "^\+.*(${SELF_CORRECT_PATTERNS})"; then
        LEARNING_DETECTED=true
        REASON="Diff contains correction-related language"
    fi
fi

# ============================================================================
# CHECK 3: Removing/reverting recently added code
# If lines are being removed that were just added, it's a correction
# ============================================================================
if [ "$LEARNING_DETECTED" = false ]; then
    # Check if there are more deletions than additions in a small change
    ADDITIONS=$(git diff --numstat 2>/dev/null | awk '{sum += $1} END {print sum+0}')
    DELETIONS=$(git diff --numstat 2>/dev/null | awk '{sum += $2} END {print sum+0}')

    # If deleting more than adding in a small change, likely reverting a mistake
    if [ "$DELETIONS" -gt "$ADDITIONS" ] && [ "$DELETIONS" -lt 50 ]; then
        LEARNING_DETECTED=true
        REASON="Removing more code than adding (likely reverting mistake)"
    fi
fi

# ============================================================================
# CHECK 4: Same function/block being edited (surgical fix)
# Small, targeted edits to specific lines suggest fixing a bug
# ============================================================================
if [ "$LEARNING_DETECTED" = false ]; then
    TOTAL_CHANGES=$((ADDITIONS + DELETIONS))

    # Very small, surgical changes (1-5 lines) are often bug fixes
    if [ "$TOTAL_CHANGES" -gt 0 ] && [ "$TOTAL_CHANGES" -le 10 ]; then
        # Check if it's changing logic (not just formatting)
        if echo "$DIFF_CONTENT" | grep -qE "^\+.*(\|\||&&|===|!==|return|if|else|throw)"; then
            LEARNING_DETECTED=true
            REASON="Small surgical edit to logic (likely bug fix)"
        fi
    fi
fi

# ============================================================================
# OUTPUT: Auto-queue learning if any check triggered
# ============================================================================
if [ "$LEARNING_DETECTED" = true ]; then
    # Auto-queue the learning for Claude to process
    bash /Users/josh/code/crosswords/.claude/scripts/auto-queue-learning.sh

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎓 LEARNING AUTO-QUEUED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Reason: $REASON"
    echo "→ I'll process this into CLAUDE.md now."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
