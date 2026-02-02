# Azmat Puzzle Benchmarks

> Analysis of 34 existing puzzles created by Azmat to establish gold standard benchmarks for our puzzle generator.
>
> **Generated**: February 2026
> **Source Data**: `/puzzles/01-34/*.ipuz`
> **Analysis Script**: `/app/scripts/analyze-azmat-puzzles.ts`

---

## Executive Summary

| Metric | Azmat's Average | Our Target |
|--------|-----------------|------------|
| Islamic % | 35% | 40% (min 25%) |
| Words per puzzle | 10 | 8-12 |
| Black squares | 4.4 | 3-6 |
| Grid fill | 100% | 100% |

---

## Islamic Word Percentage

### Distribution in Azmat's Puzzles

| Range | Puzzles | Percentage |
|-------|---------|------------|
| < 30% | 13 | 38.2% |
| 30-50% | 14 | 41.2% |
| 50-70% | 6 | 17.6% |
| > 70% | 1 | 2.9% |

### Recommended Thresholds

Based on this analysis:

- **Target**: 40% Islamic words
- **Acceptable minimum**: 25%
- **Ideal**: 50%+ (stretch goal)
- **Warning threshold**: < 25%

### Key Insight

Many words Azmat uses with Islamic clues aren't in our Islamic word list. When counting "contextually Islamic" words (English words with Islamic clues), the effective Islamic content is higher.

---

## Most Common Keywords

### Top Islamic Keywords (by frequency)

| Word | Count | Notes |
|------|-------|-------|
| YUNUS | 4 | Prophet Jonah |
| UMAR | 3 | Companion/Caliph |
| ALI | 3 | Companion/Caliph |
| HARAM | 3 | Forbidden |
| AMMA | 3 | 30th Juz |
| ISA | 3 | Prophet Jesus |
| ADAM | 2 | First Prophet |
| JESUS | 2 | English for Isa |
| ENOCH | 2 | English for Idris |
| QABIL | 2 | Cain (son of Adam) |
| YAHYA | 2 | Prophet John |
| ALLAH | 2 | God |
| SALAH | 2 | Prayer |
| FIRE | 2 | Common theme |
| UMRAH | 2 | Lesser pilgrimage |
| ANSAR | 2 | Helpers of Medina |
| CAMEL | 2 | Prophet Saleh's miracle |
| MUFTI | 2 | Islamic scholar |
| ASIYA | 2 | Wife of Pharaoh |
| BADR | 2 | Battle |
| MUSA | 2 | Prophet Moses |
| FAJR | 2 | Dawn prayer |

### Prophet-Specific Keywords

#### Prophet Adam
ADAM, HAWWA, QABIL, HABIL, IBLIS, CROW, CLAY, EDEN, ANGEL

#### Prophet Nuh (Noah)
ARK, FLOOD, JUDI, IDOLS, SHIP, DOVE, WATER, FORTY

#### Prophet Ibrahim (Abraham)
KAABA, FIRE, AXE, SODOM, LOT, ISMAIL, SACRIFICE, MECCA

#### Prophet Yusuf (Joseph)
JAIL, WOLF, DREAM, TRIAL, EGYPT, COAT, SHEBA, KING, WELL

#### Prophet Musa (Moses)
STAFF, PHARAOH, NILE, HARUN, SINAI, SEA, TORAH, BASKET

#### Prophet Muhammad ﷺ
MECCA, MEDINA, QURAN, FAJR, HIJRA, BADR, UHUD, KHADIJA

---

## Missing Islamic Terms

Words Azmat uses with Islamic clues that we should add to our Islamic word list:

### High Priority (appear in clues with clear Islamic context)

| Word | Clue Example | Category |
|------|--------------|----------|
| IDDAH | Waiting period after divorce | Fiqh |
| QUDSI | Type of Hadith with Allah's words | Hadith |
| HIJR | City of Thamud | Quran location |
| TALAQ | Divorce (most hated permissible) | Fiqh |
| SIWAK | Prophet's oral hygiene | Sunnah |
| NABI | Arabic for "prophet" | General |
| AMIN | Prophet's title (The Trustworthy) | Seerah |
| ADAB | Islamic manners | General |
| ABASA | 80th Surah (He Frowned) | Quran |
| WAHY | Revelation | General |
| THANA | Opening dua in salah | Salah |
| AYAHS | Quranic verses | Quran |
| PBUH | Peace Be Upon Him | Honorific |
| RAD | 13th Surah (Thunder) | Quran |
| FIL | 105th Surah (Elephant) | Quran |

### Medium Priority (contextually Islamic)

| Word | Islamic Usage |
|------|---------------|
| ALARM | Set for Fajr prayer |
| CAT | Beloved pet in Islamic culture |
| WOMAN | Maryam in Quran |
| ARROW | Sa'd ibn Abi Waqqas |
| BEARD | Sunnah |
| SEVEN | Tawaf circuits |

---

## Clue Style Analysis

### Distribution

| Style | Percentage | Example |
|-------|------------|---------|
| Simple definition | 39% | "First vicegerent placed on earth" |
| Quotation marks | 30% | "Idle talk" in 31:6 |
| Fill-in-blank | 14% | "La ilaha ___ Allah" |
| Quran reference | 9% | (Q. 12:86) |
| Wordplay (?) | 7% | "Hospital IV League member?" |
| Abbreviation | 1% | (init.), (abbr.) |
| Cross-reference | 1% | "Letters following 1A, 5A..." |

### Clue Writing Guidelines

1. **Simple definitions** work best for Islamic terms
2. **Quran references** add authenticity - use format `(Q. chapter:verse)`
3. **Fill-in-blank** great for common phrases: "In sha ___"
4. **Wordplay** adds variety but use sparingly
5. **Cross-references** are clever but can frustrate solvers

---

## Grid Patterns

### Black Square Statistics

- **Average**: 4.4 black squares per 5x5 grid
- **Range**: 3-7 black squares
- **Most common**: 4 black squares
- **Unique patterns**: 32 across 34 puzzles

### Common Patterns

```
Pattern A (2 uses)     Pattern B (2 uses)
.....                  ...#.
.#...                  #....
...#.                  .....
...#.                  ....#
.....                  .#...
```

### Pattern Guidelines

1. Avoid more than 2 black squares in a row/column
2. Maintain connectivity (no isolated sections)
3. Symmetric patterns are traditional but not required
4. 3-6 black squares optimal for 5x5 grid

---

## Word Length Distribution

### In Azmat's Puzzles

| Length | Frequency | Notes |
|--------|-----------|-------|
| 2 letters | Common | AS, IT, GO, IN |
| 3 letters | Very common | ALI, ISA, EID, DUA |
| 4 letters | Common | ADAM, MUSA, FIRE |
| 5 letters | Common | ALLAH, JESUS, YUNUS |

### Guidelines

- 2-letter words are acceptable but should be real words
- Prefer 3-5 letter Islamic keywords
- Avoid obscure 2-letter combinations

---

## Quality Metrics Comparison

### What Makes a Good Puzzle?

| Metric | Poor | Acceptable | Good | Excellent |
|--------|------|------------|------|-----------|
| Islamic % | <25% | 25-35% | 35-50% | >50% |
| Theme words | 0-1 | 2-3 | 4-5 | 6+ |
| Invalid words | >2 | 1-2 | 0 | 0 |
| Grid fill | <90% | 90-95% | 95-99% | 100% |
| Black squares | >7 | 5-7 | 3-5 | 3-4 |

---

## Files Reference

- **Analysis script**: `/app/scripts/analyze-azmat-puzzles.ts`
- **JSON export**: `/app/scripts/azmat-analysis.json`
- **Original puzzles**: `/puzzles/01-34/`
- **This document**: `/docs/azmat-puzzle-benchmarks.md`

---

## Changelog

- **Feb 2026**: Initial analysis of 34 puzzles
