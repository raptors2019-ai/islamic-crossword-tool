# Islamic Crossword Puzzle Generator

A Python tool for generating freeform crossword puzzles using Islamic-themed word lists. Designed for [myislam.org](https://myislam.org/crossword-puzzle/).

## Features

- **Freeform Grid Generation**: Creates mini-crossword style puzzles (not standard 15x15)
- **Islamic Word Lists**: Pre-loaded with 800+ Islamic vocabulary words including:
  - General Islamic terms (594 words)
  - Prophet stories (198 words)
  - Companions of the Prophet (24 words)
- **Pre-written Clues**: Word lists include definitions that serve as puzzle clues
- **Multiple Export Formats**: JSON, HTML (interactive), and text (printable)
- **Batch Generation**: Generate multiple puzzles at once (e.g., 30 for Ramadan)

## Quick Start

```bash
# Generate a single puzzle (prints to console)
python generate.py

# Generate with HTML output
python generate.py --output html

# Generate 30 puzzles for Ramadan
python generate_ramadan.py
```

## Usage

### Basic Generation

```bash
# Generate one puzzle
python generate.py

# Generate 5 puzzles
python generate.py --count 5

# Generate puzzles with 10 words each
python generate.py --words 10

# Start puzzle with a specific word
python generate.py --seed QURAN
```

### Output Formats

```bash
# Console output (default)
python generate.py

# JSON format (for web widgets)
python generate.py --output json

# HTML format (interactive player)
python generate.py --output html

# Plain text (printable)
python generate.py --output text

# All formats at once
python generate.py --output all
```

### Customization

```bash
# Set puzzle title and author
python generate.py --title "Ramadan Special" --author "MyIslam.org"

# Control word length
python generate.py --min-length 4 --max-length 8

# Use custom word list
python generate.py --wordlist /path/to/wordlist.txt
```

## Output Files

Generated files are saved to the `output/` directory:

- `puzzle_TIMESTAMP_N.json` - JSON format for web integration
- `puzzle_TIMESTAMP_N.html` - Interactive HTML puzzle
- `puzzle_TIMESTAMP_N_solution.html` - HTML with answers shown
- `puzzle_TIMESTAMP_N.txt` - Plain text format

## JSON Format

The JSON output is designed for easy web widget integration:

```json
{
  "metadata": {
    "title": "Islamic Crossword",
    "author": "myislam.org",
    "rows": 10,
    "cols": 12,
    "wordCount": 7
  },
  "grid": [...],
  "clues": {
    "across": [...],
    "down": [...]
  }
}
```

## Word List Format

Word lists use semicolon-separated format:

```
WORD;SCORE;CLUE
QURAN;100;Muslim Holy Book
HAJJ;100;Pilgrimage to Mecca
SALAH;100;Fajr, Dhuhr, Asr, Maghrib, Isha
```

## Project Structure

```
crosswords/
├── generate.py           # Main CLI tool
├── generate_ramadan.py   # Batch generator for Ramadan
├── src/
│   ├── __init__.py
│   ├── word_list.py      # Word list parsing
│   ├── grid.py           # Grid representation
│   ├── generator.py      # Crossword generation algorithm
│   └── exporter.py       # Export to various formats
├── words_lists/
│   ├── Islamic words (3).txt
│   ├── prophet stories (2).txt
│   └── ten (3).txt
└── output/               # Generated puzzles
```

## Algorithm

The generator uses a greedy placement algorithm:

1. Start with a seed word placed horizontally in the center
2. Find words that can intersect with placed words (sharing letters)
3. Place words that create valid crossings
4. Repeat until target word count is reached
5. Compact the grid to remove empty margins

This approach works well for freeform/mini crosswords where strict symmetry isn't required.

## Requirements

- Python 3.8+
- No external dependencies (uses only standard library)

## For Ramadan

Generate a full month of puzzles:

```bash
python generate_ramadan.py
```

This creates 30 puzzles in `output/ramadan_2025/` with:
- `day_01.json` through `day_30.json`
- `day_01.html` through `day_30.html`
- `day_01.txt` through `day_30.txt`
