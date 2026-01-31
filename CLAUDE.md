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
- **50%+ Islamic words** - Validate with IslamicPercentBadge
- **No repeated clues** - Track in Convex/Google Sheets
- **Categories**: prophets, names-of-allah, quran, companions, general

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
