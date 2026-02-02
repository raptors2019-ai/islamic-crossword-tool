# Verify Islamic Percentage

Check the Islamic word percentage in the current grid or a specified word list.

## Steps

1. Read the current grid state from:
   - If in the web app context: check `editableCells` state
   - If given a list of words: analyze those words

2. For each word, check if it's Islamic using `word-index.ts`:
   - `ISLAMIC_WORDS_SET` - Core Islamic keywords (prophets, Names of Allah, etc.)
   - `ISLAMIC_FILLER_WORDS` - Themed words (PEACE, LIGHT, FAITH, etc.)

3. Calculate and report:
   - Total words in grid
   - Islamic words count
   - Islamic percentage
   - Pass/Fail status (must be >= 50%)

4. If below 50%, suggest:
   - Which non-Islamic words could be replaced
   - Islamic alternatives that fit the same pattern
   - Whether regeneration might help

## Word Classification Reference

**Islamic Keywords (100 pts):** Prophet names, Names of Allah, Quran terms
- ADAM, NUH, MUSA, ISA, ALLAH, QURAN, SALAH, HAJJ, etc.

**Islamic Fillers (70 pts):** Themed but not specifically Islamic
- PEACE, LIGHT, TRUTH, FAITH, MERCY, HOPE, PRAY, etc.

**Common English (40 pts):** Standard crossword words
- Everything else from the dictionary

## Example Output
```
Grid Analysis:
- Total words: 10
- Islamic: 6 (60%)
- Status: PASS

Breakdown:
  Islamic Keywords: ADAM, MUSA, QURAN (3)
  Islamic Fillers: PEACE, FAITH, LIGHT (3)
  English: DREAM, STORM, NIGHT, WATER (4)
```
