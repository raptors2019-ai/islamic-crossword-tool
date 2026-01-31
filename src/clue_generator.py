"""
AI-powered clue generator for Islamic crossword puzzles.

Uses Anthropic Claude API to generate multiple clue options per word.
Based on the "How to clue.txt" prompt template from Azmat.
"""

import os
from typing import Optional
from dataclasses import dataclass


@dataclass
class GeneratedClue:
    """A single generated clue."""
    clue: str
    clue_type: str  # "analogy", "dictionary", "simple", "phrase", "idiom", "sneaky"
    islamic_connection: bool  # Whether the clue has Islamic context


@dataclass
class ClueGenerationResult:
    """Result of generating clues for a word."""
    word: str
    clues: list[GeneratedClue]
    error: Optional[str] = None


# Clue generation prompt template (based on "How to clue.txt")
CLUE_PROMPT_TEMPLATE = """You are an expert cruciverbist (crossword puzzle creator) in the style of Patrick Barry and Will Shortz, specializing in Islamic-themed crossword puzzles.

Generate 7-10 diverse clue options for the word: {word}

Context:
- This is for a 5x5 Islamic crossword puzzle (simple format)
- Target audience: Muslims of all ages
- Clues should be challenging but not too obscure
- Prioritize clues with Islamic connections when possible
- Support spelling variants: QURAN/KORAN, MUSA/MOSES, etc.
- Use "___" (three underscores) for blanks in clues

Clue Types to Include:
1. **Analogy clues** - Using "A:B::C:?" format or comparisons
2. **Clever dictionary clues** - Wordplay on definitions
3. **Simple straightforward clues** - Direct definitions
4. **Familiar phrase clues** - "_____ in the morning" style
5. **Idiom clues** - Based on common expressions
6. **Sneaky clues** - Misdirection or double meanings

{islamic_context}

Return EXACTLY this JSON format (no markdown, no extra text):
{{
  "word": "{word}",
  "clues": [
    {{"clue": "clue text here", "type": "simple", "islamic": true}},
    {{"clue": "another clue", "type": "analogy", "islamic": false}}
  ]
}}

Requirements:
- Generate exactly 7-10 clues
- Each clue must be unique and different in approach
- At least 3 clues should have Islamic connections if the word is Islamic
- Clues should be suitable for all ages
- No offensive or controversial content
- Keep clues concise (under 100 characters each)"""


def get_islamic_context(word: str, existing_clue: Optional[str] = None) -> str:
    """Generate Islamic context hint for the word."""
    word_upper = word.upper()

    # Prophet names
    prophet_names = {
        "ADAM": "First prophet and first man",
        "NUH": "Prophet Noah, built the Ark",
        "IBRAHIM": "Father of prophets, friend of Allah",
        "MUSA": "Prophet Moses, received Torah",
        "ISA": "Prophet Jesus, born of Maryam",
        "MUHAMMAD": "Final Prophet, peace be upon him",
        "YUSUF": "Prophet Joseph, interpreter of dreams",
        "DAWUD": "Prophet David, given Zabur (Psalms)",
        "SULAIMAN": "Prophet Solomon, ruled jinn and animals",
        "AYYUB": "Prophet Job, model of patience",
        "YUNUS": "Prophet Jonah, in the whale",
        "IDRIS": "Prophet Enoch, first to write",
        "HUD": "Sent to people of 'Ad",
        "SALIH": "Sent to Thamud with she-camel",
        "SHUAIB": "Prophet of Midian, against fraud",
        "HARUN": "Aaron, brother of Musa",
        "YAHYA": "John the Baptist",
        "ZAKARIYA": "Zechariah, guardian of Maryam",
        "ISMAIL": "Ishmael, son of Ibrahim",
        "ISHAQ": "Isaac, son of Ibrahim",
        "YAQUB": "Jacob, father of 12 sons",
    }

    if word_upper in prophet_names:
        return f"\nIslamic Context: This word is a Prophet's name. {prophet_names[word_upper]}"

    # Names of Allah
    allah_names = {"RAHMAN", "RAHIM", "MALIK", "QUDDUS", "SALAM", "AZIZ", "JABBAR",
                   "KHALIQ", "ALIM", "HAKAM", "LATIF", "KHABIR", "GHAFUR", "WADUD"}

    if word_upper in allah_names:
        return "\nIslamic Context: This is one of the 99 Names of Allah (Asma ul-Husna)."

    # Quranic terms
    quran_terms = {"QURAN", "SURAH", "AYAH", "JUZ", "FATIHA", "BAQARAH", "KAHF"}

    if word_upper in quran_terms:
        return "\nIslamic Context: This is a Quranic term."

    # Pillars and practices
    pillars = {"SALAH", "SAWM", "ZAKAT", "HAJJ", "SHAHADA", "FAJR", "DHUHR",
               "ASR", "MAGHRIB", "ISHA", "WUDU", "GHUSL", "TAYAMMUM"}

    if word_upper in pillars:
        return "\nIslamic Context: This relates to the pillars of Islam or worship practices."

    if existing_clue:
        return f"\nExisting clue for reference: \"{existing_clue}\""

    return "\nIslamic Context: Try to find Islamic connections if possible."


class ClueGenerator:
    """
    Generate multiple clue options for crossword words using AI.

    Requires ANTHROPIC_API_KEY environment variable to be set.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.client = None

        if self.api_key:
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except ImportError:
                print("Warning: anthropic package not installed. Run: pip install anthropic")

    def generate_clues(
        self,
        word: str,
        existing_clue: Optional[str] = None,
        num_clues: int = 7
    ) -> ClueGenerationResult:
        """
        Generate multiple clue options for a word.

        Args:
            word: The word to generate clues for
            existing_clue: Optional existing clue for context
            num_clues: Target number of clues to generate (7-10)

        Returns:
            ClueGenerationResult with list of generated clues
        """
        if not self.client:
            return ClueGenerationResult(
                word=word,
                clues=[],
                error="Anthropic client not initialized. Set ANTHROPIC_API_KEY."
            )

        word = word.upper()
        islamic_context = get_islamic_context(word, existing_clue)

        prompt = CLUE_PROMPT_TEMPLATE.format(
            word=word,
            islamic_context=islamic_context
        )

        try:
            message = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            # Parse response
            response_text = message.content[0].text

            # Extract JSON from response
            import json
            try:
                data = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code block
                import re
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    data = json.loads(json_match.group())
                else:
                    return ClueGenerationResult(
                        word=word,
                        clues=[],
                        error=f"Failed to parse JSON response: {response_text[:200]}"
                    )

            # Convert to GeneratedClue objects
            clues = []
            for clue_data in data.get("clues", []):
                clues.append(GeneratedClue(
                    clue=clue_data.get("clue", ""),
                    clue_type=clue_data.get("type", "simple"),
                    islamic_connection=clue_data.get("islamic", False)
                ))

            return ClueGenerationResult(word=word, clues=clues)

        except Exception as e:
            return ClueGenerationResult(
                word=word,
                clues=[],
                error=str(e)
            )

    def generate_batch(
        self,
        words: list[str],
        existing_clues: Optional[dict[str, str]] = None
    ) -> list[ClueGenerationResult]:
        """Generate clues for multiple words."""
        results = []
        existing_clues = existing_clues or {}

        for word in words:
            result = self.generate_clues(
                word,
                existing_clue=existing_clues.get(word.upper())
            )
            results.append(result)

        return results


# Alternative: Generate clues without API (template-based)
def generate_template_clues(word: str, existing_clue: Optional[str] = None) -> list[GeneratedClue]:
    """
    Generate basic clue templates without API.
    Useful for testing or when API is not available.
    """
    word = word.upper()
    clues = []

    # Add existing clue as "simple" type
    if existing_clue:
        clues.append(GeneratedClue(
            clue=existing_clue,
            clue_type="simple",
            islamic_connection=True
        ))

    # Template clues based on word characteristics
    clues.append(GeneratedClue(
        clue=f"Islamic term meaning [{word}]",
        clue_type="dictionary",
        islamic_connection=True
    ))

    clues.append(GeneratedClue(
        clue=f"_____ (Arabic word)",
        clue_type="phrase",
        islamic_connection=True
    ))

    # Length-based clue
    clues.append(GeneratedClue(
        clue=f"{len(word)}-letter Islamic word",
        clue_type="simple",
        islamic_connection=True
    ))

    return clues


if __name__ == "__main__":
    # Test the clue generator
    generator = ClueGenerator()

    test_words = ["ADAM", "QURAN", "SALAH"]

    for word in test_words:
        print(f"\n{'='*50}")
        print(f"Generating clues for: {word}")
        print('='*50)

        result = generator.generate_clues(word)

        if result.error:
            print(f"Error: {result.error}")
        else:
            for i, clue in enumerate(result.clues, 1):
                islamic = "✓" if clue.islamic_connection else "○"
                print(f"{i}. [{clue.clue_type}] {islamic} {clue.clue}")
