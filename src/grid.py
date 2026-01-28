"""
Crossword grid representation and manipulation.
Supports freeform/shaped grids for Islamic crossword puzzles.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Direction(Enum):
    ACROSS = "across"
    DOWN = "down"


@dataclass
class Cell:
    """Represents a single cell in the crossword grid."""
    row: int
    col: int
    letter: Optional[str] = None
    is_black: bool = False
    number: Optional[int] = None

    @property
    def is_empty(self) -> bool:
        return self.letter is None and not self.is_black

    @property
    def is_filled(self) -> bool:
        return self.letter is not None


@dataclass
class PlacedWord:
    """Represents a word placed in the grid."""
    word: str
    clue: str
    row: int
    col: int
    direction: Direction
    number: int

    @property
    def end_row(self) -> int:
        if self.direction == Direction.ACROSS:
            return self.row
        return self.row + len(self.word) - 1

    @property
    def end_col(self) -> int:
        if self.direction == Direction.ACROSS:
            return self.col + len(self.word) - 1
        return self.col

    def get_cells(self) -> list[tuple[int, int]]:
        """Get all cell coordinates this word occupies."""
        cells = []
        for i in range(len(self.word)):
            if self.direction == Direction.ACROSS:
                cells.append((self.row, self.col + i))
            else:
                cells.append((self.row + i, self.col))
        return cells


class Grid:
    """
    Represents a crossword puzzle grid.
    Supports freeform shapes (not just rectangular).
    """

    def __init__(self, rows: int, cols: int):
        self.rows = rows
        self.cols = cols
        self.cells: dict[tuple[int, int], Cell] = {}
        self.placed_words: list[PlacedWord] = []
        self._next_number = 1

        # Initialize all cells as empty (white)
        for r in range(rows):
            for c in range(cols):
                self.cells[(r, c)] = Cell(row=r, col=c)

    def get_cell(self, row: int, col: int) -> Optional[Cell]:
        """Get cell at position, or None if out of bounds."""
        return self.cells.get((row, col))

    def set_black(self, row: int, col: int):
        """Mark a cell as black (blocked)."""
        if (row, col) in self.cells:
            self.cells[(row, col)].is_black = True
            self.cells[(row, col)].letter = None

    def set_letter(self, row: int, col: int, letter: str):
        """Set a letter in a cell."""
        if (row, col) in self.cells:
            cell = self.cells[(row, col)]
            if not cell.is_black:
                cell.letter = letter.upper()

    def get_letter(self, row: int, col: int) -> Optional[str]:
        """Get the letter at a position."""
        cell = self.get_cell(row, col)
        if cell:
            return cell.letter
        return None

    def can_place_word(self, word: str, row: int, col: int, direction: Direction) -> bool:
        """
        Check if a word can be placed at the given position.
        Returns True if:
        - All cells are within bounds
        - No cell is black
        - Existing letters match or cells are empty
        - Word doesn't create invalid adjacencies
        """
        word = word.upper()

        for i, letter in enumerate(word):
            if direction == Direction.ACROSS:
                r, c = row, col + i
            else:
                r, c = row + i, col

            cell = self.get_cell(r, c)
            if cell is None:
                return False  # Out of bounds
            if cell.is_black:
                return False  # Can't place on black cell
            if cell.letter is not None and cell.letter != letter:
                return False  # Letter conflict

        # Check for invalid adjacencies (word touching parallel word without crossing)
        # For across words, check cells above and below
        # For down words, check cells left and right
        for i, letter in enumerate(word):
            if direction == Direction.ACROSS:
                r, c = row, col + i
                # Check above and below for non-crossing adjacency
                above = self.get_cell(r - 1, c)
                below = self.get_cell(r + 1, c)
                current = self.get_cell(r, c)

                # If current cell is empty (not a crossing), check adjacencies
                if current and current.letter is None:
                    if above and above.letter is not None:
                        return False
                    if below and below.letter is not None:
                        return False
            else:
                r, c = row + i, col
                # Check left and right for non-crossing adjacency
                left = self.get_cell(r, c - 1)
                right = self.get_cell(r, c + 1)
                current = self.get_cell(r, c)

                if current and current.letter is None:
                    if left and left.letter is not None:
                        return False
                    if right and right.letter is not None:
                        return False

        # Check that word boundaries don't touch other letters
        if direction == Direction.ACROSS:
            # Check cell before start
            before = self.get_cell(row, col - 1)
            if before and before.letter is not None:
                return False
            # Check cell after end
            after = self.get_cell(row, col + len(word))
            if after and after.letter is not None:
                return False
        else:
            # Check cell before start
            before = self.get_cell(row - 1, col)
            if before and before.letter is not None:
                return False
            # Check cell after end
            after = self.get_cell(row + len(word), col)
            if after and after.letter is not None:
                return False

        return True

    def place_word(self, word: str, clue: str, row: int, col: int, direction: Direction) -> Optional[PlacedWord]:
        """
        Place a word in the grid if valid.
        Returns the PlacedWord if successful, None otherwise.
        """
        if not self.can_place_word(word, row, col, direction):
            return None

        word = word.upper()

        # Determine the number for this word
        # Check if the starting cell already has a number
        start_cell = self.get_cell(row, col)
        if start_cell.number is not None:
            number = start_cell.number
        else:
            number = self._next_number
            self._next_number += 1
            start_cell.number = number

        # Place the letters
        for i, letter in enumerate(word):
            if direction == Direction.ACROSS:
                self.set_letter(row, col + i, letter)
            else:
                self.set_letter(row + i, col, letter)

        placed = PlacedWord(
            word=word,
            clue=clue,
            row=row,
            col=col,
            direction=direction,
            number=number
        )
        self.placed_words.append(placed)
        return placed

    def find_intersections(self, word: str) -> list[tuple[int, int, Direction, int]]:
        """
        Find all valid positions where a word can be placed,
        preferring positions that intersect with existing words.

        Returns list of (row, col, direction, intersection_count) tuples.
        """
        word = word.upper()
        positions = []

        # Check each letter of the new word against placed letters
        for r in range(self.rows):
            for c in range(self.cols):
                cell = self.get_cell(r, c)
                if cell is None or cell.letter is None:
                    continue

                # This cell has a letter - check if our word contains it
                for i, letter in enumerate(word):
                    if letter == cell.letter:
                        # Try placing word ACROSS with intersection at position i
                        start_col = c - i
                        if self.can_place_word(word, r, start_col, Direction.ACROSS):
                            # Count intersections
                            intersections = sum(
                                1 for j in range(len(word))
                                if self.get_letter(r, start_col + j) is not None
                            )
                            positions.append((r, start_col, Direction.ACROSS, intersections))

                        # Try placing word DOWN with intersection at position i
                        start_row = r - i
                        if self.can_place_word(word, start_row, c, Direction.DOWN):
                            intersections = sum(
                                1 for j in range(len(word))
                                if self.get_letter(start_row + j, c) is not None
                            )
                            positions.append((start_row, c, Direction.DOWN, intersections))

        return positions

    def get_bounds(self) -> tuple[int, int, int, int]:
        """Get the bounding box of filled cells (min_row, min_col, max_row, max_col)."""
        min_row = self.rows
        min_col = self.cols
        max_row = 0
        max_col = 0

        for (r, c), cell in self.cells.items():
            if cell.letter is not None:
                min_row = min(min_row, r)
                min_col = min(min_col, c)
                max_row = max(max_row, r)
                max_col = max(max_col, c)

        if min_row > max_row:  # No filled cells
            return (0, 0, 0, 0)

        return (min_row, min_col, max_row, max_col)

    def compact(self) -> "Grid":
        """Return a new grid with empty rows/cols removed."""
        min_row, min_col, max_row, max_col = self.get_bounds()

        new_rows = max_row - min_row + 1
        new_cols = max_col - min_col + 1
        new_grid = Grid(new_rows, new_cols)

        # Copy cells with offset
        for (r, c), cell in self.cells.items():
            if min_row <= r <= max_row and min_col <= c <= max_col:
                new_r = r - min_row
                new_c = c - min_col
                new_cell = new_grid.get_cell(new_r, new_c)
                new_cell.letter = cell.letter
                new_cell.is_black = cell.is_black
                new_cell.number = cell.number

        # Update placed words with new coordinates
        for pw in self.placed_words:
            new_grid.placed_words.append(PlacedWord(
                word=pw.word,
                clue=pw.clue,
                row=pw.row - min_row,
                col=pw.col - min_col,
                direction=pw.direction,
                number=pw.number
            ))

        new_grid._next_number = self._next_number
        return new_grid

    def to_string(self, show_numbers: bool = True) -> str:
        """Convert grid to ASCII art representation."""
        min_row, min_col, max_row, max_col = self.get_bounds()

        if min_row > max_row:
            return "(empty grid)"

        lines = []

        # Header with column numbers
        header = "   "
        for c in range(min_col, max_col + 1):
            header += f"{c % 10} "
        lines.append(header)

        for r in range(min_row, max_row + 1):
            line = f"{r:2} "
            for c in range(min_col, max_col + 1):
                cell = self.get_cell(r, c)
                if cell is None or (cell.letter is None and not cell.is_black):
                    line += ". "
                elif cell.is_black:
                    line += "# "
                else:
                    line += f"{cell.letter} "
            lines.append(line)

        return "\n".join(lines)

    def get_across_words(self) -> list[PlacedWord]:
        """Get all across words, sorted by number."""
        return sorted(
            [w for w in self.placed_words if w.direction == Direction.ACROSS],
            key=lambda w: w.number
        )

    def get_down_words(self) -> list[PlacedWord]:
        """Get all down words, sorted by number."""
        return sorted(
            [w for w in self.placed_words if w.direction == Direction.DOWN],
            key=lambda w: w.number
        )
