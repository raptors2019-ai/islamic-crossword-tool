"""
Islamic Crossword Puzzle Generator

A tool for generating freeform crossword puzzles from Islamic word lists.
"""

from .word_list import Word, WordList, load_word_list, load_all_islamic_lists
from .grid import Grid, Cell, Direction, PlacedWord
from .generator import CrosswordGenerator, ThemedGenerator, Grid5x5Generator
from .exporter import CrosswordExporter
from .clue_generator import ClueGenerator, GeneratedClue, ClueGenerationResult, generate_template_clues
from .sheets_sync import GoogleSheetsSync, UsedClue, PuzzleRecord, create_new_tracking_sheet

__version__ = "0.1.0"
__all__ = [
    "Word",
    "WordList",
    "load_word_list",
    "load_all_islamic_lists",
    "Grid",
    "Cell",
    "Direction",
    "PlacedWord",
    "CrosswordGenerator",
    "ThemedGenerator",
    "Grid5x5Generator",
    "CrosswordExporter",
    "ClueGenerator",
    "GeneratedClue",
    "ClueGenerationResult",
    "generate_template_clues",
    "GoogleSheetsSync",
    "UsedClue",
    "PuzzleRecord",
    "create_new_tracking_sheet",
]
