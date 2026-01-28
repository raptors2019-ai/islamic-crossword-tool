"""
Islamic Crossword Puzzle Generator

A tool for generating freeform crossword puzzles from Islamic word lists.
"""

from .word_list import Word, WordList, load_word_list, load_all_islamic_lists
from .grid import Grid, Cell, Direction, PlacedWord
from .generator import CrosswordGenerator, ThemedGenerator
from .exporter import CrosswordExporter

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
    "CrosswordExporter",
]
