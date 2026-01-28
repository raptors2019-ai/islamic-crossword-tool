#!/usr/bin/env python3
"""
Command-line tool for generating Islamic crossword puzzles.

Usage:
    python generate.py                    # Generate a single puzzle
    python generate.py --count 5          # Generate 5 puzzles
    python generate.py --words 10         # Target 10 words per puzzle
    python generate.py --theme prophets   # Use prophet stories theme
    python generate.py --output html      # Export as HTML
"""

import argparse
import os
import sys
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.word_list import load_all_islamic_lists, load_word_list
from src.generator import CrosswordGenerator, ThemedGenerator
from src.exporter import CrosswordExporter


def main():
    parser = argparse.ArgumentParser(
        description="Generate Islamic crossword puzzles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate.py                           # Generate one puzzle, print to console
  python generate.py --count 7 --output json   # Generate 7 puzzles as JSON files
  python generate.py --words 10 --output html  # 10-word puzzle as interactive HTML
  python generate.py --theme prophets          # Prophet stories themed puzzle
  python generate.py --seed QURAN              # Start puzzle with specific word
        """
    )

    parser.add_argument(
        "--count", "-n",
        type=int,
        default=1,
        help="Number of puzzles to generate (default: 1)"
    )

    parser.add_argument(
        "--words", "-w",
        type=int,
        default=7,
        help="Target number of words per puzzle (default: 7)"
    )

    parser.add_argument(
        "--min-length",
        type=int,
        default=3,
        help="Minimum word length (default: 3)"
    )

    parser.add_argument(
        "--max-length",
        type=int,
        default=10,
        help="Maximum word length (default: 10)"
    )

    parser.add_argument(
        "--theme", "-t",
        choices=["all", "prophets", "names"],
        default="all",
        help="Theme for puzzle (default: all)"
    )

    parser.add_argument(
        "--seed", "-s",
        type=str,
        help="Seed word to start the puzzle with"
    )

    parser.add_argument(
        "--output", "-o",
        choices=["console", "json", "html", "text", "all"],
        default="console",
        help="Output format (default: console)"
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default="output",
        help="Output directory for files (default: output)"
    )

    parser.add_argument(
        "--title",
        type=str,
        default="Islamic Crossword",
        help="Puzzle title"
    )

    parser.add_argument(
        "--author",
        type=str,
        default="myislam.org",
        help="Puzzle author"
    )

    parser.add_argument(
        "--wordlist",
        type=str,
        help="Path to custom word list file"
    )

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed output"
    )

    args = parser.parse_args()

    # Load word list
    base_dir = os.path.dirname(os.path.abspath(__file__))
    words_dir = os.path.join(base_dir, "words_lists")

    if args.wordlist:
        word_list = load_word_list(args.wordlist)
        print(f"Loaded {len(word_list)} words from {args.wordlist}")
    else:
        word_list = load_all_islamic_lists(words_dir)
        print(f"Loaded {len(word_list)} Islamic words")

    # Filter words with clues
    with_clues = word_list.filter_with_clues()
    print(f"Words with clues: {len(with_clues)}")

    # Create generator
    generator = CrosswordGenerator(
        word_list=with_clues if len(with_clues) >= args.words else word_list,
        target_words=args.words,
        min_word_length=args.min_length,
        max_word_length=args.max_length,
        max_attempts=100
    )

    # Generate puzzles
    print(f"\nGenerating {args.count} puzzle(s) with {args.words} words each...")

    os.makedirs(args.output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    for i in range(args.count):
        puzzle_num = i + 1

        if args.verbose:
            print(f"\nAttempting puzzle {puzzle_num}...")

        grid = generator.generate(seed_word=args.seed)

        if not grid:
            print(f"Failed to generate puzzle {puzzle_num}")
            continue

        # Create exporter
        title = f"{args.title} #{puzzle_num}" if args.count > 1 else args.title
        exporter = CrosswordExporter(grid, title=title, author=args.author)

        # Output based on format
        if args.output == "console" or args.output == "all":
            print(f"\n{'=' * 50}")
            print(f"Puzzle {puzzle_num}: {len(grid.placed_words)} words")
            print(f"{'=' * 50}")
            print(grid.to_string())
            print("\nACROSS:")
            for word in grid.get_across_words():
                print(f"  {word.number}. {word.clue}")
            print("\nDOWN:")
            for word in grid.get_down_words():
                print(f"  {word.number}. {word.clue}")

        if args.output in ["json", "all"]:
            filename = f"{args.output_dir}/puzzle_{timestamp}_{puzzle_num}.json"
            exporter.save(filename, "json")
            print(f"Saved: {filename}")

        if args.output in ["html", "all"]:
            filename = f"{args.output_dir}/puzzle_{timestamp}_{puzzle_num}.html"
            exporter.save(filename, "html")
            print(f"Saved: {filename}")

            # Also save solution version
            filename_sol = f"{args.output_dir}/puzzle_{timestamp}_{puzzle_num}_solution.html"
            exporter.save(filename_sol, "html_solution")
            print(f"Saved: {filename_sol}")

        if args.output in ["text", "all"]:
            filename = f"{args.output_dir}/puzzle_{timestamp}_{puzzle_num}.txt"
            exporter.save(filename, "text")
            print(f"Saved: {filename}")

    print("\nDone!")


if __name__ == "__main__":
    main()
