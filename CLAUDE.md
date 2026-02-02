# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Islamic Crossword Puzzle Tool for myislam.org. Two main parts:
1. **Python CLI** (root) - Generate crossword puzzles via command line
2. **Next.js App** (`/app`) - Web-based 5x5 puzzle builder with Convex backend

**Goal:** Create 365 daily Islamic crossword puzzles. First milestone: 50-60 Prophet Stories puzzles.

## Commands

### Python CLI (from repo root)
```bash
python generate.py                    # Generate single puzzle
python generate.py --count 5          # Generate 5 puzzles
python generate.py --output json      # Export as JSON
python generate.py --seed QURAN       # Start with specific word
python generate_ramadan.py            # Generate 30 Ramadan puzzles
```

### Next.js App (from /app)
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npx convex dev       # Start Convex dev server
npx convex deploy    # Deploy Convex functions
```

## Architecture

### Python Backend (`/src`)
- `generator.py` - CrosswordGenerator (freeform) and Grid5x5Generator (5x5 only)
- `grid.py` - Grid representation with word placement logic
- `exporter.py` - Export to JSON, IPUZ, HTML, Flutter JSON
- `word_list.py` - Parse word lists (format: `WORD;SCORE;CLUE`)
- `clue_generator.py` - AI clue generation via Anthropic
- `sheets_sync.py` - Google Sheets integration for clue tracking

### Next.js Frontend (`/app/src`)
- `app/page.tsx` - Single-page 5x5 puzzle builder (3-column layout)
- `lib/generator-api.ts` - Client-side puzzle generation (local simulation)
- `lib/export-flutter.ts` - Flutter JSON export for myislam.org app
- `lib/types.ts` - TypeScript interfaces (GeneratedPuzzle, ThemeWord, etc.)
- `lib/sample-data.ts` - 130+ Islamic words (prophets, names of Allah, etc.)

### Convex Backend (`/app/convex`)
- `schema.ts` - Database schema (words, clues, puzzles, clueUsage)
- `words.ts` - Word CRUD, listFor5x5 query, bulk import
- `clues.ts` - Clue management with usage tracking
- `gridGenerator.ts` - Server-side 5x5 generator action
- `clueGeneration.ts` - AI clue generation via Anthropic
- `themeKeywords.ts` - Theme-based keyword extraction

### Key Components (`/app/src/components`)
- `crossword-grid.tsx` - Interactive puzzle grid with controls
- `theme-selector.tsx` - Theme dropdown (prophets, ramadan, etc.)
- `islamic-percent-badge.tsx` - Shows % Islamic words (must be ≥50%)
- `puzzle-stats.tsx` - Grid quality metrics
- `filler-suggestions.tsx` - Alternatives for unplaced words

## Key Constraints

- **5x5 grid only** - All words must be 5 letters or less
- **25%+ Islamic words** (minimum), **40%+ target**, **50%+ ideal** - See benchmarks below
- **No repeated clues** - Track in Convex/Google Sheets
- **Categories**: prophets, names-of-allah, quran, companions, general

## Azmat Puzzle Benchmarks (Gold Standard)

> Based on analysis of 34 existing puzzles. Full details: `/docs/azmat-puzzle-benchmarks.md`

### Islamic Percentage Thresholds

| Level | Percentage | Notes |
|-------|------------|-------|
| **Minimum** | 25% | Reject puzzles below this |
| **Acceptable** | 25-35% | Azmat's average is 35% |
| **Target** | 40% | Aim for this |
| **Ideal** | 50%+ | Stretch goal (only 21% of Azmat's hit this) |

### Quality Metrics

| Metric | Azmat's Average | Our Target |
|--------|-----------------|------------|
| Words per puzzle | 10 | 8-12 |
| Black squares | 4.4 | 3-6 |
| Theme keywords | 3-4 | 3-5 |

### Top Keywords by Prophet

- **Adam**: ADAM, HAWWA, QABIL, HABIL, IBLIS, CROW, CLAY
- **Nuh**: ARK, FLOOD, JUDI, IDOLS, FORTY
- **Ibrahim**: KAABA, FIRE, AXE, SODOM, LOT
- **Yusuf**: JAIL, WOLF, DREAM, TRIAL, EGYPT, COAT
- **Musa**: STAFF, NILE, HARUN, SINAI, TORAH
- **Muhammad**: MECCA, MEDINA, QURAN, FAJR, HIJRA, BADR

### Commonly Used English Fillers

AS, IT, GO, IN, ALL, TO, NO, AN, OR (2-letter)
ALI, ISA, EID, DUA, NUR, ARK (3-letter Islamic)

### Clue Style Mix

- 39% simple definitions
- 30% quotation marks
- 14% fill-in-blank (___)
- 9% Quran references (Q. 12:86)
- 7% wordplay (?)

## Export Formats

- **Flutter JSON** - For myislam.org mobile app (primary)
- **IPUZ** - Standard crossword format
- **PDF** - For printing

## Environment Variables

Copy `.env.example` to `.env`:
- `ANTHROPIC_API_KEY` - For AI clue generation
- `GOOGLE_SHEETS_ID` - Clue tracking spreadsheet
- `GOOGLE_SHEETS_CREDENTIALS_FILE` - Service account JSON path

## Word List Format

Files in `/words_lists/` use semicolon-separated format:
```
WORD;SCORE;CLUE
QURAN;100;Muslim Holy Book
HAJJ;100;Pilgrimage to Mecca
```

## Auto-Generator Algorithm (Feb 2026)

The 5x5 puzzle generator uses a "Verify-Greedy + Bias + Blacks + Recovery" strategy:

### Four Core Mechanisms

1. **Friendliest-First Ordering** (`scoreKeywordFriendliness()`)
   - Score keywords by letter friendliness: AEIOSTRNL = +10, QJXZKFYWV = -20
   - Place high-scoring words first (DREAM=55, MANNA=65) before low-scoring (YUSUF=-5)
   - Rationale: Friendly letters have more cross-word options

2. **Verify Before Commit** (`verifyCompletable()`)
   - Before committing placement, verify grid is still completable
   - Uses thresholds: 60% for early words, 80% for later words
   - Immediately rejects if ANY slot with 2+ constraints has 0 candidates
   - Checks ALL constrained slots (including 1-letter constraints)

3. **Islamic-Biased CSP Fill** (`fillGridWithBiasedCSP()`)
   - Islamic words fill first, then English as fallback
   - Forces Islamic-only when below 25% threshold (minimum)
   - Target: 40% Islamic words (Azmat's avg is 35%)

4. **Recovery Loop** (in `generatePuzzle()`)
   - Up to 3 attempts with different strategies
   - Attempt 1: Normal generation
   - Attempt 2: Shuffled theme word order
   - Attempt 3: Fewer theme words (drop hardest one)
   - NEVER returns partial/invalid results as success

### Validation Guarantees (Feb 2026 Fix)

The generator now guarantees:
- **100% grid fill** - No empty white cells when `success: true`
- **100% valid words** - Every detected word is in the dictionary
- **No garbage letters** - CSP timeout properly clears invalid placements
- **Clean partial results** - Even failed attempts have valid (incomplete) grids

### Key Files
- `app/src/lib/auto-generator.ts` - Main generation logic + recovery loop
- `app/src/lib/auto-generator.test.ts` - Tests for all 25 prophets (100% pass rate)
- `app/src/lib/csp-filler.ts` - CSP fill with Islamic bias + proper backtracking
- `app/src/lib/word-index.ts` - Split Islamic/English indices

### Running Tests
```bash
cd app && npm test -- auto-generator.test.ts
```

All 25 prophets tested (including scraped from myislam.org):
ADAM, NUH, IBRAHIM, ISMAIL, ISHAQ, YAQUB, YUSUF, AYYUB, MUSA, HARUN,
DAWUD, SULAIMAN, YUNUS, IDRIS, HUD, SALIH, SHUAIB, LUT, YAHYA, ZAKARIYA,
ISA, MUHAMMAD, DHUL_KIFL, ILYAS, AL_YASA

### Debugging Tips
- If only 1 theme word places: Check `verifyCompletable()` threshold
- If Islamic % is low: Check `fillGridWithBiasedCSP()` target
- If grid incomplete: Check `autoAddBlacks()` max limit and recovery loop
- If invalid words appear: Check `validateWordFragmentsAfterBlack()` and CSP backtracking

## Learnings (Don't Repeat These!)

> After any correction, say: "Update CLAUDE.md so you don't make that mistake again."
> Use `/learn` to add new learnings.

- Never use `git add .` or `git add -A` - always specify files to avoid committing .env or node_modules
- 2-letter words must be valid English - check with `hasWord()` from word-index.ts before placing
- Prophet names can have Arabic/English variants (MUSA/MOSES, ISA/JESUS) - check `spellingVariants` array
- Always run `npm run lint` before committing - CI will fail on lint errors
- The grid is 5x5 - words longer than 5 letters will NEVER fit, filter them early
- `BLOCKED_WORDS` in word-index.ts contains haram terms (alcohol, pork, gambling) - never suggest these
- When editing React state, never mutate directly - always create new objects/arrays
- Convex queries are reactive - don't call them in loops, use proper query patterns
- Many Islamic terms are missing from our word list - check `/docs/azmat-puzzle-benchmarks.md` for words like IDDAH, QUDSI, NABI, SIWAK, ADAB, TALAQ, WAHY
- English words can be "Islamic" with the right clue (ALARM for Fajr, CAT for Muslim pet culture) - context matters
- After changing generator code, RESTART the dev server (`npm run dev`) - hot reload doesn't always pick up lib changes
- When testing the generator, use `npm test -- auto-generator.test.ts` to verify changes work before testing in the UI

## Slash Commands

Custom commands in `.claude/commands/`:

| Command | Description |
|---------|-------------|
| `/test-generator` | Run generator tests and verify output |
| `/new-prophet-puzzle <name>` | Generate puzzle for a specific prophet |
| `/verify-islamic-pct` | Check Islamic word percentage in grid |
| `/learn [description]` | Add a learning to prevent repeating mistakes |
