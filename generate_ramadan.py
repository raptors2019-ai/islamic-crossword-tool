#!/usr/bin/env python3
"""
Generate a full set of crossword puzzles for Ramadan.

Ramadan 2025/1446 is approximately 30 days.
This script generates a puzzle for each day.
"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.word_list import load_all_islamic_lists
from src.generator import CrosswordGenerator
from src.exporter import CrosswordExporter


def main():
    print("=" * 60)
    print("Ramadan Crossword Puzzle Generator")
    print("=" * 60)

    # Load word lists
    base_dir = os.path.dirname(os.path.abspath(__file__))
    words_dir = os.path.join(base_dir, "words_lists")

    word_list = load_all_islamic_lists(words_dir)
    with_clues = word_list.filter_with_clues()

    print(f"\nLoaded {len(word_list)} total words")
    print(f"Words with clues: {len(with_clues)}")

    # Create output directory
    output_dir = "output/ramadan_2025"
    os.makedirs(output_dir, exist_ok=True)

    # Generate 30 puzzles (one per day of Ramadan)
    num_puzzles = 30
    target_words = 7  # Mini-crossword style
    successful = 0

    generator = CrosswordGenerator(
        word_list=with_clues,
        target_words=target_words,
        min_word_length=3,
        max_word_length=10,
        max_attempts=150
    )

    print(f"\nGenerating {num_puzzles} puzzles...")
    print("-" * 40)

    for day in range(1, num_puzzles + 1):
        grid = generator.generate()

        if not grid:
            print(f"Day {day:2}: FAILED")
            continue

        word_count = len(grid.placed_words)
        title = f"Ramadan Day {day}"

        exporter = CrosswordExporter(
            grid,
            title=title,
            author="myislam.org"
        )

        # Save in multiple formats
        base_name = f"day_{day:02d}"

        # JSON (for web widget)
        json_path = f"{output_dir}/{base_name}.json"
        exporter.save(json_path, "json")

        # HTML (interactive)
        html_path = f"{output_dir}/{base_name}.html"
        exporter.save(html_path, "html")

        # Text (for reference/printing)
        text_path = f"{output_dir}/{base_name}.txt"
        exporter.save(text_path, "text")

        successful += 1
        across = len(grid.get_across_words())
        down = len(grid.get_down_words())
        print(f"Day {day:2}: {word_count} words ({across}A, {down}D) ✓")

    print("-" * 40)
    print(f"\nGenerated {successful}/{num_puzzles} puzzles successfully")
    print(f"Files saved to: {output_dir}/")
    print("\nFiles for each day:")
    print("  - day_XX.json  (for web widget)")
    print("  - day_XX.html  (interactive version)")
    print("  - day_XX.txt   (printable version)")


if __name__ == "__main__":
    main()
