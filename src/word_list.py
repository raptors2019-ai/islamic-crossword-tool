"""
Word list parser for Islamic crossword puzzle generator.
Handles different word list formats and provides filtering/selection utilities.
"""

import os
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class Word:
    """Represents a word with its score and clue/definition."""
    word: str
    score: int
    clue: Optional[str] = None

    @property
    def length(self) -> int:
        return len(self.word)

    def __hash__(self):
        return hash(self.word)

    def __eq__(self, other):
        if isinstance(other, Word):
            return self.word == other.word
        return False


class WordList:
    """Manages a collection of words for crossword generation."""

    def __init__(self, name: str = ""):
        self.name = name
        self.words: list[Word] = []
        self._by_length: dict[int, list[Word]] = {}

    def add_word(self, word: Word):
        """Add a word to the list."""
        self.words.append(word)
        length = word.length
        if length not in self._by_length:
            self._by_length[length] = []
        self._by_length[length].append(word)

    def get_by_length(self, length: int) -> list[Word]:
        """Get all words of a specific length."""
        return self._by_length.get(length, [])

    def get_words_in_range(self, min_len: int, max_len: int) -> list[Word]:
        """Get words within a length range."""
        result = []
        for length in range(min_len, max_len + 1):
            result.extend(self.get_by_length(length))
        return result

    def filter_by_score(self, min_score: int) -> "WordList":
        """Return a new WordList with only words meeting minimum score."""
        filtered = WordList(f"{self.name} (score >= {min_score})")
        for word in self.words:
            if word.score >= min_score:
                filtered.add_word(word)
        return filtered

    def filter_with_clues(self) -> "WordList":
        """Return a new WordList with only words that have clues."""
        filtered = WordList(f"{self.name} (with clues)")
        for word in self.words:
            if word.clue:
                filtered.add_word(word)
        return filtered

    def sample(self, n: int, min_len: int = 3, max_len: int = 15) -> list[Word]:
        """Randomly sample n words within length constraints."""
        candidates = self.get_words_in_range(min_len, max_len)
        if len(candidates) <= n:
            return candidates
        return random.sample(candidates, n)

    def __len__(self):
        return len(self.words)

    def __iter__(self):
        return iter(self.words)


def parse_islamic_format(filepath: str) -> WordList:
    """
    Parse word lists in Islamic format: WORD;SCORE;DEFINITION
    Also handles WORD;SCORE format (no definition).
    """
    name = Path(filepath).stem
    word_list = WordList(name)

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            parts = line.split(';')
            if len(parts) < 1:
                continue

            word = parts[0].strip().upper()
            if not word or not word.isalpha():
                continue

            # Parse score (default to 50 if not present or invalid)
            score = 50
            if len(parts) >= 2 and parts[1].strip():
                try:
                    score = int(parts[1].strip())
                except ValueError:
                    pass

            # Parse clue/definition
            clue = None
            if len(parts) >= 3 and parts[2].strip():
                clue = parts[2].strip()
                # Clean up clue - remove leading/trailing quotes and spaces
                clue = clue.strip('" ')
                # Replace double quotes with single quotes for cleaner display
                clue = clue.replace('""', '"')
                # Remove trailing unclosed quotes
                if clue.endswith('"') and clue.count('"') % 2 == 1:
                    clue = clue[:-1]

            word_list.add_word(Word(word=word, score=score, clue=clue))

    return word_list


def parse_dict_format(filepath: str) -> WordList:
    """
    Parse word lists in dict format: WORD;SCORE
    """
    name = Path(filepath).stem
    word_list = WordList(name)

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            parts = line.split(';')
            if len(parts) < 1:
                continue

            word = parts[0].strip().upper()
            if not word or not word.isalpha():
                continue

            # Parse score
            score = 50
            if len(parts) >= 2 and parts[1].strip():
                try:
                    score = int(parts[1].strip())
                except ValueError:
                    pass

            word_list.add_word(Word(word=word, score=score, clue=None))

    return word_list


def load_word_list(filepath: str) -> WordList:
    """Auto-detect format and load a word list."""
    if filepath.endswith('.dict'):
        return parse_dict_format(filepath)
    else:
        return parse_islamic_format(filepath)


def load_all_islamic_lists(directory: str) -> WordList:
    """Load and merge all Islamic-themed word lists."""
    combined = WordList("Islamic Combined")

    files = [
        "Islamic words (3).txt",
        "prophet stories (2).txt",
        "ten (3).txt"
    ]

    for filename in files:
        filepath = os.path.join(directory, filename)
        if os.path.exists(filepath):
            word_list = parse_islamic_format(filepath)
            for word in word_list:
                combined.add_word(word)

    return combined


if __name__ == "__main__":
    # Test the word list loading
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    words_dir = os.path.join(base_dir, "words_lists")

    # Load Islamic words
    islamic = load_all_islamic_lists(words_dir)
    print(f"Loaded {len(islamic)} Islamic words")

    # Show some stats
    with_clues = islamic.filter_with_clues()
    print(f"Words with clues: {len(with_clues)}")

    # Sample by length
    for length in range(3, 10):
        words = islamic.get_by_length(length)
        print(f"  {length} letters: {len(words)} words")
