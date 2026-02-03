/**
 * Tests for Auto-Generator
 *
 * Success criteria:
 * - 100% grid fill (no empty white cells)
 * - All detected words are valid dictionary words
 * - Islamic percentage >= 25%
 * - Test each prophet's keywords
 * - 10 runs same input → >= 7 successes
 */

import {
  generatePuzzle,
  validateAllWords,
  ThemeWord,
  GenerationResult,
} from './auto-generator';
import { createEmptyGrid, GRID_SIZE } from './editable-grid';
import { detectWords } from './word-detector';
import { getDefaultWordIndex } from './word-index';

// Prophet-specific theme words for testing
// These match the keywords from prophet-keywords.ts (all 25 prophets)
const PROPHET_THEMES: Record<string, ThemeWord[]> = {
  // Core prophets
  ADAM: [
    { word: 'ADAM', clue: 'First prophet' },
    { word: 'HAWWA', clue: "Adam's wife" },
    { word: 'IBLIS', clue: 'Refused to bow' },
    { word: 'CLAY', clue: 'Adam was created from this' },
  ],
  NUH: [
    { word: 'NUH', clue: 'Prophet of the flood' },
    { word: 'ARK', clue: "Nuh's vessel" },
    { word: 'FLOOD', clue: 'Great deluge' },
    { word: 'JUDI', clue: 'Mountain where ark landed' },
  ],
  IBRAHIM: [
    { word: 'FIRE', clue: 'Ibrahim was thrown into this' },
    { word: 'AXE', clue: 'Tool to smash idols' },
    { word: 'SARAH', clue: "Ibrahim's wife" },
    { word: 'HAGAR', clue: "Ismail's mother" },
  ],
  ISMAIL: [
    { word: 'KAABA', clue: 'Built with Ibrahim' },
    { word: 'WATER', clue: 'Zamzam appeared' },
    { word: 'RAM', clue: 'Sacrificed instead' },
    { word: 'HAJJ', clue: 'Pilgrimage rituals' },
  ],
  ISHAQ: [
    { word: 'ISHAQ', clue: 'Son born to Sarah' },
    { word: 'ISAAC', clue: 'English name' },
    { word: 'SARAH', clue: 'His mother' },
    { word: 'THREE', clue: 'Angels who visited' },
    { word: 'ANGEL', clue: 'Brought glad tidings' },
    { word: 'SMILE', clue: "Sarah's reaction" },
    { word: 'TWINS', clue: 'Ishaq fathered sons' },
  ],
  YAQUB: [
    { word: 'YAQUB', clue: 'Father of twelve' },
    { word: 'JACOB', clue: 'English name' },
    { word: 'BLIND', clue: 'From grief over Yusuf' },
    { word: 'SHIRT', clue: 'Restored his sight' },
    { word: 'STARS', clue: 'In Yusuf\'s dream' },
    { word: 'TEARS', clue: 'Wept until blind' },
    { word: 'DREAM', clue: 'Prophetic vision' },
    { word: 'MOON', clue: 'Bowed in dream' },
  ],
  YUSUF: [
    { word: 'YUSUF', clue: 'Prophet of dreams' },
    { word: 'DREAM', clue: 'Yusuf interpreted' },
    { word: 'JAIL', clue: 'Where imprisoned' },
    { word: 'EGYPT', clue: 'Where he ruled' },
  ],
  AYYUB: [
    { word: 'AYYUB', clue: 'Patient prophet' },
    { word: 'SEVEN', clue: 'Years of suffering' },
    { word: 'JOB', clue: 'English name' },
    { word: 'RAIN', clue: 'Golden locusts' },
    { word: 'SABR', clue: 'Beautiful patience' },
    { word: 'GRASS', clue: 'Bundle for oath' },
    { word: 'SKIN', clue: 'Was afflicted' },
    { word: 'GOLD', clue: 'Locusts blessing' },
  ],
  MUSA: [
    { word: 'MUSA', clue: 'Spoke to Allah' },
    { word: 'STAFF', clue: 'Became a serpent' },
    { word: 'NILE', clue: 'River of Egypt' },
    { word: 'TORAH', clue: 'His scripture' },
  ],
  HARUN: [
    { word: 'HARUN', clue: "Musa's brother" },
    { word: 'AARON', clue: 'English name' },
    { word: 'CALF', clue: 'Golden idol' },
    { word: 'MUSA', clue: 'His brother' },
    { word: 'SPEAK', clue: 'His eloquence' },
    { word: 'AIDE', clue: "Musa's helper" },
    { word: 'SINAI', clue: 'Holy mountain' },
    { word: 'ELDER', clue: 'Older brother' },
  ],
  DAWUD: [
    { word: 'DAWUD', clue: 'Killed Jalut' },
    { word: 'ZABUR', clue: 'His scripture' },
    { word: 'IRON', clue: 'Made soft for him' },
    { word: 'SLING', clue: 'His weapon' },
  ],
  SULAIMAN: [
    { word: 'JINN', clue: 'He commanded them' },
    { word: 'ANT', clue: 'Warned its colony' },
    { word: 'WIND', clue: 'He controlled it' },
    { word: 'BIRD', clue: 'Hoopoe served him' },
  ],
  YUNUS: [
    { word: 'YUNUS', clue: 'In the whale' },
    { word: 'WHALE', clue: 'Swallowed Yunus' },
    { word: 'FISH', clue: 'Man of the fish' },
    { word: 'SHIP', clue: 'He fled on it' },
  ],
  IDRIS: [
    // Prioritize friendly-letter keywords over IDRIS itself (which has unfriendly D-R-I-S combo)
    { word: 'STARS', clue: 'He studied them' },
    { word: 'RISE', clue: 'Raised high' },
    { word: 'TRUE', clue: 'Man of truth' },
    { word: 'PEN', clue: 'First to write with' },
    { word: 'WISE', clue: 'His attribute' },
    { word: 'NUH', clue: 'Great-grandson' },
  ],
  HUD: [
    { word: 'HUD', clue: "Sent to 'Ad" },
    { word: 'AD', clue: 'His people' },
    { word: 'WIND', clue: 'Destroyed them' },
    { word: 'IRAM', clue: 'City with pillars' },
    { word: 'STORM', clue: 'Violent destruction' },
    { word: 'RUINS', clue: 'Remains of Ad' },
    { word: 'SAND', clue: 'Buried in' },
    { word: 'STONE', clue: 'Carved homes' },
  ],
  SALIH: [
    { word: 'SALIH', clue: 'Sent to Thamud' },
    { word: 'CAMEL', clue: 'The miracle' },
    { word: 'ROCK', clue: 'Camel emerged' },
    { word: 'MILK', clue: "Camel's provision" },
  ],
  SHUAIB: [
    { word: 'WOOD', clue: 'Companions of the wood' },
    { word: 'TRADE', clue: 'Dishonest practice' },
    { word: 'SCALE', clue: 'Honest weights' },
    { word: 'STONE', clue: 'Rained on them' },
    { word: 'SHEEP', clue: 'Flock for Musa' },
    { word: 'STORM', clue: 'Dark cloud' },
    { word: 'MUSA', clue: 'Son-in-law' },
    { word: 'HEAT', clue: 'Before punishment' },
  ],
  LUT: [
    { word: 'LUT', clue: "Ibrahim's nephew" },
    { word: 'LOT', clue: 'English name' },
    { word: 'SODOM', clue: 'Sinful city' },
    { word: 'STONE', clue: 'Rained on them' },
  ],
  YAHYA: [
    // Use diverse friendly keywords
    { word: 'TEARS', clue: 'Shed in devotion' },
    { word: 'PURE', clue: 'And devout' },
    { word: 'SON', clue: 'To Zakariya' },
    { word: 'NOBLE', clue: 'Prophet' },
  ],
  ZAKARIYA: [
    // Prioritize friendly keywords over YAHYA (unfriendly Y letters)
    { word: 'ALTAR', clue: 'Where he prayed' },
    { word: 'ROOM', clue: 'Maryam\'s sanctuary' },
    { word: 'SIGN', clue: 'Made mute as' },
    { word: 'HEIR', clue: 'Prayed for' },
    { word: 'THREE', clue: 'Days mute' },
    { word: 'NIGHT', clue: 'Called on Lord at' },
    { word: 'ALONE', clue: 'Called in secret' },
  ],
  ISA: [
    { word: 'ISA', clue: 'Born without father' },
    { word: 'INJIL', clue: 'His scripture' },
    { word: 'MARY', clue: 'His mother' },
    { word: 'HEAL', clue: 'Cured the sick' },
    { word: 'DEAD', clue: 'Raised them' },
  ],
  MUHAMMAD: [
    { word: 'MECCA', clue: 'Birthplace' },
    { word: 'HIRA', clue: 'Cave of revelation' },
    { word: 'HIJRA', clue: 'Migration' },
    { word: 'QURAN', clue: 'Final scripture' },
    { word: 'BADR', clue: 'First battle' },
  ],
  // Scraped prophets from myislam.org
  DHUL_KIFL: [
    // Prioritize friendly keywords
    { word: 'REST', clue: 'Never from worship' },
    { word: 'RISE', clue: 'Raised to high station' },
    { word: 'SENT', clue: 'Messenger of Allah' },
    { word: 'TRUE', clue: 'To his word' },
    { word: 'NIGHT', clue: 'Spent in prayer' },
    { word: 'TRIAL', clue: 'Faced with patience' },
    { word: 'TRUST', clue: 'Known for' },
    { word: 'SABR', clue: 'His patience' },
  ],
  ILYAS: [
    // Prioritize friendly keywords
    { word: 'RAIN', clue: 'Prayed and it came' },
    { word: 'ALTAR', clue: 'Called upon Allah' },
    { word: 'STONE', clue: 'Built altar from' },
    { word: 'ALONE', clue: 'Fled to wilderness' },
    { word: 'SENT', clue: 'Warner to people' },
    { word: 'RISEN', clue: 'To high station' },
    { word: 'BAAL', clue: 'Idol worshipped' },
  ],
  AL_YASA: [
    { word: 'YASA', clue: 'Part of his name' },
    { word: 'ILYAS', clue: 'His predecessor' },
    { word: 'RAIN', clue: 'Ended drought' },
    { word: 'HEAL', clue: 'Healed the sick' },
    { word: 'DEAD', clue: 'Raised them' },
    { word: 'PURE', clue: 'Chosen and excellent' },
    { word: 'BAAL', clue: 'Idol worshipped' },
  ],
};

// Helper to check grid fill percentage
function getGridFillPercentage(grid: ReturnType<typeof createEmptyGrid>): number {
  let whiteCells = 0;
  let filledCells = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c].isBlack) {
        whiteCells++;
        if (grid[r][c].letter) {
          filledCells++;
        }
      }
    }
  }

  return whiteCells > 0 ? (filledCells / whiteCells) * 100 : 0;
}

// Helper to check if all words are valid
function areAllWordsValid(grid: ReturnType<typeof createEmptyGrid>): {
  valid: boolean;
  invalidWords: string[];
} {
  const words = detectWords(grid);
  const invalidWords = words.filter((w) => !w.isValid).map((w) => w.word);
  return {
    valid: invalidWords.length === 0,
    invalidWords,
  };
}


describe('Auto-Generator', () => {
  const wordIndex = getDefaultWordIndex();

  describe('validateAllWords', () => {
    it('should detect valid grids', () => {
      const grid = createEmptyGrid();
      // Empty grid should have no words, so valid
      const result = validateAllWords(grid);
      expect(result.valid).toBe(true);
    });
  });

  describe('generatePuzzle - Basic Functionality', () => {
    it('should generate a puzzle with theme words', () => {
      const themeWords: ThemeWord[] = [
        { word: 'ISLAM', clue: 'The religion' },
        { word: 'PEACE', clue: 'Salam means this' },
      ];

      const result = generatePuzzle(themeWords, {
        wordIndex,
        maxTimeMs: 10000,
      });

      // Should complete without crashing
      expect(result).toBeDefined();
      expect(result.grid).toBeDefined();
      expect(result.stats).toBeDefined();
    });
  });

  describe('100% Grid Fill Requirement', () => {
    it('should fill all white cells when successful', () => {
      const themeWords: ThemeWord[] = [
        { word: 'SALAT', clue: 'Prayer' },
        { word: 'QURAN', clue: 'Holy book' },
      ];

      const result = generatePuzzle(themeWords, {
        wordIndex,
        maxTimeMs: 15000,
      });

      if (result.success) {
        const fillPercentage = getGridFillPercentage(result.grid);
        expect(fillPercentage).toBe(100);
      }
    });
  });

  describe('All Valid Words Requirement', () => {
    it('should only contain valid dictionary words when successful', () => {
      const themeWords: ThemeWord[] = [
        { word: 'FAITH', clue: 'Belief' },
        { word: 'IMAN', clue: 'Faith in Arabic' },
      ];

      const result = generatePuzzle(themeWords, {
        wordIndex,
        maxTimeMs: 15000,
      });

      if (result.success) {
        const validation = areAllWordsValid(result.grid);
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.log('Invalid words found:', validation.invalidWords);
        }
      }
    });
  });

  describe('Islamic Percentage Requirement', () => {
    it('should achieve at least 25% Islamic words when successful', () => {
      const themeWords: ThemeWord[] = [
        { word: 'ALLAH', clue: 'God' },
        { word: 'NABI', clue: 'Prophet' },
        { word: 'DUA', clue: 'Prayer' },
      ];

      const result = generatePuzzle(themeWords, {
        wordIndex,
        maxTimeMs: 15000,
      });

      if (result.success) {
        // Islamic percentage should be at least 25%
        expect(result.stats.islamicPercentage).toBeGreaterThanOrEqual(25);
      }
    });
  });

  describe('Prophet-Specific Tests', () => {
    const prophets = Object.keys(PROPHET_THEMES);

    for (const prophet of prophets) {
      it(`should generate valid puzzle for ${prophet} theme`, () => {
        const themeWords = PROPHET_THEMES[prophet];
        const result = generatePuzzle(themeWords, {
          wordIndex,
          maxTimeMs: 15000,
        });

        if (result.success) {
          // Verify 100% fill
          const fillPercentage = getGridFillPercentage(result.grid);
          expect(fillPercentage).toBe(100);

          // Verify all words are valid
          const validation = areAllWordsValid(result.grid);
          expect(validation.valid).toBe(true);
          if (!validation.valid) {
            console.log(`${prophet}: Invalid words:`, validation.invalidWords);
          }
        }
      });
    }
  });

  describe('Success Rate Tests', () => {
    it('should achieve >= 70% success rate over 10 runs', () => {
      const themeWords: ThemeWord[] = [
        { word: 'ADAM', clue: 'First prophet' },
        { word: 'CLAY', clue: 'Created from' },
      ];

      let successCount = 0;
      const runs = 10;

      for (let i = 0; i < runs; i++) {
        const result = generatePuzzle(themeWords, {
          wordIndex,
          maxTimeMs: 10000,
        });

        if (result.success) {
          const fillPercentage = getGridFillPercentage(result.grid);
          const validation = areAllWordsValid(result.grid);

          if (fillPercentage === 100 && validation.valid) {
            successCount++;
          }
        }
      }

      const successRate = (successCount / runs) * 100;
      console.log(`ADAM Success rate: ${successRate}% (${successCount}/${runs})`);
      expect(successRate).toBeGreaterThanOrEqual(70);
    });

    it('should achieve >= 80% success rate per prophet', () => {
      const prophets = Object.keys(PROPHET_THEMES);
      const runsPerProphet = 5;

      for (const prophet of prophets) {
        let successCount = 0;
        const themeWords = PROPHET_THEMES[prophet];

        for (let i = 0; i < runsPerProphet; i++) {
          const result = generatePuzzle(themeWords, {
            wordIndex,
            maxTimeMs: 10000,
          });

          if (result.success) {
            const fillPercentage = getGridFillPercentage(result.grid);
            const validation = areAllWordsValid(result.grid);

            if (fillPercentage === 100 && validation.valid) {
              successCount++;
            }
          }
        }

        const successRate = (successCount / runsPerProphet) * 100;
        console.log(`${prophet} Success rate: ${successRate}% (${successCount}/${runsPerProphet})`);
        expect(successRate).toBeGreaterThanOrEqual(80);
      }
    });
  });

  describe('Never Return Invalid Results', () => {
    it('should NEVER return success with invalid words', () => {
      const themes = Object.values(PROPHET_THEMES);
      const runs = 5;

      for (const themeWords of themes) {
        for (let i = 0; i < runs; i++) {
          const result = generatePuzzle(themeWords, {
            wordIndex,
            maxTimeMs: 10000,
          });

          // If success is true, ALL words MUST be valid
          if (result.success) {
            const validation = areAllWordsValid(result.grid);
            expect(validation.valid).toBe(true);
            if (!validation.valid) {
              console.log('CRITICAL: Success returned with invalid words:', validation.invalidWords);
              console.log('Theme:', themeWords.map((t) => t.word).join(', '));
            }
          }
        }
      }
    });

    it('should NEVER return success with incomplete grid', () => {
      const themes = Object.values(PROPHET_THEMES);
      const runs = 5;

      for (const themeWords of themes) {
        for (let i = 0; i < runs; i++) {
          const result = generatePuzzle(themeWords, {
            wordIndex,
            maxTimeMs: 10000,
          });

          // If success is true, grid MUST be 100% filled
          if (result.success) {
            const fillPercentage = getGridFillPercentage(result.grid);
            expect(fillPercentage).toBe(100);
            if (fillPercentage < 100) {
              console.log('CRITICAL: Success returned with incomplete grid:', fillPercentage);
              console.log('Theme:', themeWords.map((t) => t.word).join(', '));
            }
          }
        }
      }
    });
  });
});
