# Islamic Crossword Puzzle Tool - Requirements

*Based on interview with Azmat (Jan 30, 2026)*

## Overview

**Goal:** Create 365 daily Islamic crossword puzzles for myislam.org
**First Milestone:** 50-60 puzzles focused on "Prophet Stories" theme
**Target Audience:** Mixed/Family - accessible but satisfying to solve
**Current Pain Point:** 1-2 hours per puzzle using Crosserville + manual processes

---

## Core Constraints

### Grid Format
- **5x5 grid ONLY** (not NYT-style 15x15)
- Words must be **5 letters or less**
- Symmetry **does NOT matter** for 5x5
- Can add black squares for flexibility

### Word Selection Rules
- **At least 50% Islamic/Arabic words** (7 out of 10 is good)
- Arabic/Islamic words preferred over English
- English filler words acceptable when needed
- Words CAN repeat across puzzles (just not same day)
- **Clues must NOT repeat** for the same word across puzzles

### Theme Structure
- Prophet Stories is the main theme category
- Sub-themes: Prophet Muhammad, Prophet Adam, Prophet Nuh, Prophet Lut, etc.
- Each prophet can have **multiple puzzles** (e.g., 10 puzzles for Prophet Muhammad)
- Reference: https://myislam.org/prophet-stories/

---

## Current Workflow (Pain Points)

1. **Chooses theme** (e.g., Prophet Muhammad)
2. **Manually brainstorms keywords** ← SLOW
3. **Uses Crosserville** to arrange words ← TRIAL AND ERROR
   - Tool suggests non-Islamic words
   - No theme awareness
   - Manual trial and error for placement
4. **Finds clues** via ChatGPT or wordplays.com ← TIME CONSUMING
   - Needs Islamic-focused clues
   - Takes multiple attempts to get good ones
5. **Tracks in Google Sheet** to avoid clue repetition
6. **Exports** to IPUZ/Across Lite → converts to JSON for app

---

## Ideal State (What to Build)

### Full Workflow
1. **Pick theme** → "Prophet Muhammad"
2. **Auto-generate keywords** (5 letters or less, themed)
3. **Select keywords** → tool suggests next best fit
4. **Auto-arrange** 5x5 grid with Islamic filler suggestions
5. **Auto-generate clues** (Islamic-focused, multiple options)
6. **Export** to JSON (and IPUZ)

### Key Features

#### Theme → Keywords
- User selects theme (from myislam.org/prophet-stories/ categories)
- System shows relevant 5-letter-or-less keywords from database
- Keywords scored by relevance and grid-friendliness

#### Smart Grid Builder
- Given selected keywords, auto-arrange in 5x5
- When word doesn't fit, suggest Islamic alternatives first
- Show "accessibility score" for word choices
- Allow regeneration to find better solutions
- Can start from scratch easily (frustration is real!)

#### Clue Generator
- Auto-generate Islamic-focused clues
- Show multiple options per word
- Track which clues have been used for each word
- Prevent duplicate clues across puzzles

#### Tracking & Export
- Sync with Google Sheet (already connected)
- Track: word → puzzle number → clue used
- Export to JSON format (for mobile app)
- Export to IPUZ format

---

## Data Structures

### JSON Export Format (for myislam.org app)
```json
{
  "code": "PUZ_CROSSWORD_PROPHETS_001",
  "type": "CROSSWORD",
  "title": "Prophets Crossword",
  "description": "Complete the crossword...",
  "theme": "prophets",
  "difficulty": "MEDIUM",
  "data": {
    "grid": {
      "rows": 5,
      "cols": 5,
      "cells": [["A","D","A","M","#"], ...]
    },
    "clues": {
      "across": [
        {
          "number": 1,
          "clue": "First vicegerent placed on earth",
          "answer": "ADAM",
          "startPosition": {"row": 0, "col": 0},
          "length": 4
        }
      ],
      "down": [...]
    },
    "cellNumbers": [
      {"row": 0, "col": 0, "number": 1}
    ]
  },
  "metadata": {
    "estimatedTime": 300,
    "pointsPerWord": 15,
    "bonusForCompletion": 50,
    "hintsAllowed": 3
  }
}
```

### Google Sheet Structure
- **Clue Tracker**: Word | Clue | Puzzle Title | Puzzle Number | Date Used
- **Puzzles**: Puzzle Number | Title | Theme | Date Created | Words Used | IPUZ Exported

---

## Existing Resources

### Word Lists
- `/words_lists/` - 800+ Islamic words with clues
- `/words_lists/prophet stories (4).txt` - Prophet-specific vocabulary

### Existing Puzzles
- `/puzzles/` - 34 completed puzzles with IPUZ, PDF, TXT formats
- Can learn patterns from these

### Integrations
- **Google Sheets**: Already configured (ID: `1ZQ0I2lvAsf8hNcdoNiFukdOw5NmJZYsGm2MG7UKN518`)
- **Convex Database**: Schema already supports words, clues, puzzles
- **Anthropic API**: For AI clue generation

---

## Technical Notes

### Clue Tips
- `___` (3 underscores) = blank in clue
- Balance difficulty (mix of easy and hard)
- Islamic context preferred over dictionary definitions

### Export Formats
1. **IPUZ** - Standard crossword format
2. **Across Lite (.puz)** - Legacy format
3. **JSON** - For myislam.org mobile app
4. **PDF** - For printing

---

## Success Metrics

- Reduce puzzle creation time from 1-2 hours to **15-30 minutes**
- Generate 50-60 Prophet Stories puzzles as first batch
- 50%+ Islamic words per puzzle
- Zero repeated clues for same word
