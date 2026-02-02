# New Prophet Puzzle

Generate a new crossword puzzle for a specific prophet.

## Arguments
- `$ARGUMENTS` - Prophet name (e.g., "Adam", "Musa", "Yusuf", "Ibrahim")

## Steps

1. Look up the prophet's keywords from `app/src/lib/prophet-keywords.ts`

2. If the prophet isn't found, list available prophets and ask which one to use.

3. Generate a puzzle using the auto-generator:
   - Use `generatePuzzle()` from `app/src/lib/auto-generator.ts`
   - Target: 3-5 theme words from the prophet's story
   - Ensure >= 50% Islamic words

4. Display results:
   - Show the generated 5x5 grid visually
   - List all placed words with their clues
   - Show Islamic word percentage
   - Report any unplaced theme words

5. Ask if user wants to:
   - Regenerate with different keywords
   - Export to Flutter JSON
   - Make manual adjustments

## Example Usage
```
/new-prophet-puzzle Yusuf
/new-prophet-puzzle Adam
```
