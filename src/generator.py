"""
Crossword puzzle generator for freeform/mini crosswords.
Optimized for Islamic-themed puzzles with pre-written clues.

Supports:
- Freeform puzzles (any size)
- Strict 5x5 grid puzzles (for Azmat's format)
- Prophet Stories theme puzzles
- Names of Allah theme puzzles
"""

import random
from typing import Optional

from .grid import Grid, Direction, PlacedWord
from .word_list import Word, WordList


class CrosswordGenerator:
    """
    Generates freeform crossword puzzles from a word list.

    Strategy:
    1. Start with a seed word (longest or highest score)
    2. Iteratively find words that intersect with placed words
    3. Use backtracking if we get stuck
    4. Stop when target word count is reached
    """

    def __init__(
        self,
        word_list: WordList,
        target_words: int = 7,
        min_word_length: int = 3,
        max_word_length: int = 10,
        grid_size: int = 20,
        max_attempts: int = 100
    ):
        self.word_list = word_list
        self.target_words = target_words
        self.min_word_length = min_word_length
        self.max_word_length = max_word_length
        self.grid_size = grid_size
        self.max_attempts = max_attempts

    def generate(self, seed_word: Optional[str] = None) -> Optional[Grid]:
        """
        Generate a crossword puzzle.

        Args:
            seed_word: Optional starting word. If None, picks a good candidate.

        Returns:
            A Grid with the puzzle, or None if generation failed.
        """
        # Get candidate words (with clues only for themed puzzles)
        candidates = self.word_list.filter_with_clues()
        if len(candidates) < self.target_words:
            # Fall back to all words if not enough with clues
            candidates = self.word_list

        available = [
            w for w in candidates
            if self.min_word_length <= w.length <= self.max_word_length
        ]

        if len(available) < self.target_words:
            print(f"Warning: Only {len(available)} words available")
            return None

        best_grid = None
        best_word_count = 0

        for attempt in range(self.max_attempts):
            grid = self._try_generate(available, seed_word)
            if grid and len(grid.placed_words) >= self.target_words:
                return grid.compact()
            elif grid and len(grid.placed_words) > best_word_count:
                best_grid = grid
                best_word_count = len(grid.placed_words)

        # Return best attempt even if it didn't reach target
        if best_grid:
            return best_grid.compact()
        return None

    def _try_generate(self, available: list[Word], seed_word: Optional[str]) -> Optional[Grid]:
        """Single attempt at generating a puzzle."""
        grid = Grid(self.grid_size, self.grid_size)
        used_words: set[str] = set()

        # Select and place seed word
        if seed_word:
            seed = next((w for w in available if w.word.upper() == seed_word.upper()), None)
        else:
            # Pick a good seed word (longer words with common letters)
            good_seeds = [w for w in available if 5 <= w.length <= 8]
            if not good_seeds:
                good_seeds = available
            seed = random.choice(good_seeds)

        if not seed:
            return None

        # Place seed word in the middle of the grid
        center = self.grid_size // 2
        start_col = center - len(seed.word) // 2
        clue = seed.clue or f"[{seed.word}]"
        grid.place_word(seed.word, clue, center, start_col, Direction.ACROSS)
        used_words.add(seed.word.upper())

        # Try to add more words
        attempts_without_progress = 0
        max_stuck = 20

        while len(grid.placed_words) < self.target_words and attempts_without_progress < max_stuck:
            # Find a word that can intersect
            placed = self._try_place_intersecting_word(grid, available, used_words)

            if placed:
                used_words.add(placed.word.upper())
                attempts_without_progress = 0
            else:
                attempts_without_progress += 1

        return grid

    def _try_place_intersecting_word(
        self,
        grid: Grid,
        available: list[Word],
        used_words: set[str]
    ) -> Optional[PlacedWord]:
        """Try to place a word that intersects with existing words."""
        # Shuffle candidates to add variety
        candidates = [w for w in available if w.word.upper() not in used_words]
        random.shuffle(candidates)

        for word_obj in candidates:
            word = word_obj.word.upper()

            # Find valid intersection positions
            positions = grid.find_intersections(word)

            if positions:
                # Prefer positions with more intersections
                positions.sort(key=lambda x: -x[3])

                for row, col, direction, _ in positions[:5]:  # Try top 5
                    clue = word_obj.clue or f"[{word}]"
                    placed = grid.place_word(word, clue, row, col, direction)
                    if placed:
                        return placed

        return None

    def generate_batch(self, count: int, seed_words: Optional[list[str]] = None) -> list[Grid]:
        """Generate multiple puzzles."""
        puzzles = []
        seeds = seed_words or [None] * count

        for i in range(count):
            seed = seeds[i] if i < len(seeds) else None
            puzzle = self.generate(seed_word=seed)
            if puzzle:
                puzzles.append(puzzle)

        return puzzles


class Grid5x5Generator:
    """
    Specialized generator for strict 5x5 crossword puzzles.

    Designed for:
    - Azmat's Islamic crossword format
    - Max 5-letter words only
    - Typically 5-7 words per puzzle
    - Black squares for grid balance

    Black Square Strategies:
    1. Corner patterns (common in mini crosswords)
    2. Symmetric patterns (traditional crossword style)
    3. Edge patterns (words extend to edges)
    """

    # Common 5x5 black square patterns (row, col positions)
    BLACK_PATTERNS = [
        # Pattern 1: Single corner
        [(0, 4)],
        # Pattern 2: Two corners
        [(0, 4), (4, 0)],
        # Pattern 3: Diagonal corners
        [(0, 4), (4, 0)],
        # Pattern 4: L-shape corner
        [(0, 4), (1, 4)],
        # Pattern 5: Cross center
        [(2, 2)],
        # Pattern 6: No black squares (dense)
        [],
        # Pattern 7: Staircase
        [(0, 4), (1, 3)],
        # Pattern 8: Two edges
        [(2, 4), (2, 0)],
    ]

    def __init__(
        self,
        word_list: WordList,
        target_words: int = 6,
        max_attempts: int = 200,
        require_islamic_majority: bool = True
    ):
        # Filter word list to max 5 letters
        self.word_list = self._filter_for_5x5(word_list)
        self.target_words = target_words
        self.max_attempts = max_attempts
        self.require_islamic_majority = require_islamic_majority

    def _filter_for_5x5(self, word_list: WordList) -> WordList:
        """Filter word list to only include words that fit in 5x5 grid."""
        filtered = WordList(f"{word_list.name} (5x5)")
        for word in word_list:
            if 2 <= word.length <= 5:
                filtered.add_word(word)
        return filtered

    def generate(self, seed_word: Optional[str] = None, black_pattern: Optional[int] = None) -> Optional[Grid]:
        """
        Generate a strict 5x5 crossword puzzle.

        Args:
            seed_word: Optional starting word (max 5 letters)
            black_pattern: Index of black square pattern to use (0-7), or None for random

        Returns:
            A 5x5 Grid with the puzzle, or None if generation failed.
        """
        # Get candidate words with clues
        candidates = self.word_list.filter_with_clues()
        if len(candidates) < self.target_words:
            candidates = self.word_list

        available = list(candidates)
        if len(available) < self.target_words:
            return None

        best_grid = None
        best_score = 0

        for attempt in range(self.max_attempts):
            # Pick a black square pattern
            if black_pattern is not None:
                pattern = self.BLACK_PATTERNS[black_pattern % len(self.BLACK_PATTERNS)]
            else:
                pattern = random.choice(self.BLACK_PATTERNS)

            grid = self._try_generate(available, seed_word, pattern)

            if grid:
                score = self._score_grid(grid)
                if len(grid.placed_words) >= self.target_words and score > best_score:
                    best_grid = grid
                    best_score = score
                    if score >= 80:  # Good enough, stop early
                        break
                elif len(grid.placed_words) >= self.target_words - 1 and score > best_score:
                    best_grid = grid
                    best_score = score

        return best_grid

    def _try_generate(
        self,
        available: list[Word],
        seed_word: Optional[str],
        black_pattern: list[tuple[int, int]]
    ) -> Optional[Grid]:
        """Single attempt at generating a 5x5 puzzle."""
        grid = Grid(5, 5)
        used_words: set[str] = set()

        # Apply black square pattern
        for row, col in black_pattern:
            grid.set_black(row, col)
            # Apply symmetric black square
            grid.set_black(4 - row, 4 - col)

        # Select seed word
        if seed_word:
            seed_word = seed_word.upper()
            if len(seed_word) > 5:
                seed_word = seed_word[:5]
            seed = next((w for w in available if w.word.upper() == seed_word), None)
        else:
            # Pick a 5-letter word as seed (fills first row nicely)
            five_letter = [w for w in available if w.length == 5]
            if five_letter:
                seed = random.choice(five_letter)
            else:
                four_letter = [w for w in available if w.length == 4]
                seed = random.choice(four_letter) if four_letter else random.choice(available)

        if not seed:
            return None

        # Place seed word in row 0
        clue = seed.clue or f"[{seed.word}]"
        placed = grid.place_word(seed.word, clue, 0, 0, Direction.ACROSS)
        if not placed:
            # Try different starting positions
            for col in range(5 - len(seed.word) + 1):
                placed = grid.place_word(seed.word, clue, 0, col, Direction.ACROSS)
                if placed:
                    break

        if not placed:
            return None

        used_words.add(seed.word.upper())

        # Try to fill the grid with intersecting words
        stuck_count = 0
        max_stuck = 30

        while len(grid.placed_words) < self.target_words and stuck_count < max_stuck:
            placed = self._place_next_word(grid, available, used_words)
            if placed:
                used_words.add(placed.word.upper())
                stuck_count = 0
            else:
                stuck_count += 1

        return grid if len(grid.placed_words) >= 3 else None

    def _place_next_word(
        self,
        grid: Grid,
        available: list[Word],
        used_words: set[str]
    ) -> Optional[PlacedWord]:
        """Try to place a word that intersects with existing words."""
        candidates = [w for w in available if w.word.upper() not in used_words]
        random.shuffle(candidates)

        for word_obj in candidates:
            word = word_obj.word.upper()
            positions = grid.find_intersections(word)

            if positions:
                # Filter positions that fit in 5x5 grid
                valid_positions = [
                    (r, c, d, count) for r, c, d, count in positions
                    if self._fits_in_grid(word, r, c, d)
                ]

                if valid_positions:
                    # Prefer more intersections
                    valid_positions.sort(key=lambda x: -x[3])

                    for row, col, direction, _ in valid_positions[:5]:
                        clue = word_obj.clue or f"[{word}]"
                        placed = grid.place_word(word, clue, row, col, direction)
                        if placed:
                            return placed

        return None

    def _fits_in_grid(self, word: str, row: int, col: int, direction: Direction) -> bool:
        """Check if word placement fits within 5x5 bounds."""
        if direction == Direction.ACROSS:
            return 0 <= row < 5 and 0 <= col and col + len(word) <= 5
        else:  # DOWN
            return 0 <= col < 5 and 0 <= row and row + len(word) <= 5

    def _score_grid(self, grid: Grid) -> int:
        """
        Score a grid based on quality metrics.

        Scores:
        - Word count (more is better)
        - Intersections (more is better)
        - Fill density (more filled cells is better)
        - Balance (mix of across/down)
        """
        score = 0

        # Word count (up to 40 points)
        score += min(len(grid.placed_words) * 6, 40)

        # Count intersections (up to 30 points)
        intersection_count = self._count_intersections(grid)
        score += min(intersection_count * 5, 30)

        # Fill density (up to 20 points)
        filled = sum(1 for (r, c), cell in grid.cells.items()
                     if cell.letter is not None and 0 <= r < 5 and 0 <= c < 5)
        fill_pct = filled / 25
        score += int(fill_pct * 20)

        # Direction balance (up to 10 points)
        across = len(grid.get_across_words())
        down = len(grid.get_down_words())
        if across > 0 and down > 0:
            balance = min(across, down) / max(across, down)
            score += int(balance * 10)

        return score

    def _count_intersections(self, grid: Grid) -> int:
        """Count cells where words intersect."""
        cell_word_count: dict[tuple[int, int], int] = {}

        for pw in grid.placed_words:
            for cell in pw.get_cells():
                cell_word_count[cell] = cell_word_count.get(cell, 0) + 1

        return sum(1 for count in cell_word_count.values() if count > 1)


class ThemedGenerator(CrosswordGenerator):
    """
    Generates themed crosswords using specific word categories.
    """

    def __init__(self, word_list: WordList, theme: str = "", **kwargs):
        super().__init__(word_list, **kwargs)
        self.theme = theme

    def generate_names_of_allah_puzzle(self, word_list: WordList) -> Optional[Grid]:
        """Generate a puzzle focused on Names of Allah."""
        # Filter for words that are likely Names of Allah
        # These typically have clues mentioning "The..." or specific patterns
        names = WordList("Names of Allah")

        for word in word_list:
            if word.clue:
                clue_lower = word.clue.lower()
                # Common patterns in Names of Allah clues
                if any(pattern in clue_lower for pattern in [
                    "the all", "the most", "the ever", "from the root",
                    "attribute", "name of allah", "99 names"
                ]):
                    names.add_word(word)

        if len(names) < 7:
            # Fall back to general Islamic words
            return self.generate()

        self.word_list = names
        return self.generate()

    def generate_prophet_stories_puzzle(self, word_list: WordList) -> Optional[Grid]:
        """Generate a puzzle focused on Prophet stories."""
        # Filter for prophet-related words
        prophets = WordList("Prophet Stories")

        prophet_names = {
            "ADAM", "NUH", "IBRAHIM", "MUSA", "ISA", "MUHAMMAD",
            "YUSUF", "DAWUD", "SULAIMAN", "AYYUB", "YUNUS", "IDRIS",
            "HUD", "SALIH", "SHUAIB", "HARUN", "YAHYA", "ZAKARIYA",
            "ISMAIL", "ISHAQ", "YAQUB", "ILYAS", "ALYASA", "DHULKIFL",
            "LUQMAN", "UZAYR"
        }

        for word in word_list:
            word_upper = word.word.upper()
            if word_upper in prophet_names:
                prophets.add_word(word)
            elif word.clue:
                clue_lower = word.clue.lower()
                # Look for prophet story references
                if any(name.lower() in clue_lower for name in prophet_names):
                    prophets.add_word(word)
                elif any(pattern in clue_lower for pattern in [
                    "prophet", "messenger", "revelation", "miracle"
                ]):
                    prophets.add_word(word)

        if len(prophets) < 7:
            return self.generate()

        self.word_list = prophets
        return self.generate()


if __name__ == "__main__":
    import os
    from .word_list import load_all_islamic_lists

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    words_dir = os.path.join(base_dir, "words_lists")

    # Load word list
    islamic_words = load_all_islamic_lists(words_dir)
    print(f"Loaded {len(islamic_words)} words")

    # Generate a puzzle
    generator = CrosswordGenerator(islamic_words, target_words=7)
    puzzle = generator.generate()

    if puzzle:
        print("\n" + puzzle.to_string())
        print("\nACROSS:")
        for word in puzzle.get_across_words():
            print(f"  {word.number}. {word.clue}")
        print("\nDOWN:")
        for word in puzzle.get_down_words():
            print(f"  {word.number}. {word.clue}")
    else:
        print("Failed to generate puzzle")
