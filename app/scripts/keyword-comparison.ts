import { generatePuzzle, ThemeWord } from '../src/lib/auto-generator';
import { getDefaultWordIndex } from '../src/lib/word-index';

const wordIndex = getDefaultWordIndex();

// Using EXACT same keywords as auto-generator.test.ts
const PROPHET_THEMES: Record<string, ThemeWord[]> = {
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
  ],
  YAQUB: [
    { word: 'YAQUB', clue: 'Father of twelve' },
    { word: 'JACOB', clue: 'English name' },
    { word: 'BLIND', clue: 'From grief over Yusuf' },
    { word: 'SHIRT', clue: 'Restored his sight' },
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
    { word: 'IDRIS', clue: 'First to write' },
    { word: 'ENOCH', clue: 'English name' },
    { word: 'WISE', clue: 'His attribute' },
  ],
  HUD: [
    { word: 'HUD', clue: "Sent to 'Ad" },
    { word: 'AD', clue: 'His people' },
    { word: 'WIND', clue: 'Destroyed them' },
    { word: 'IRAM', clue: 'City with pillars' },
  ],
  SALIH: [
    { word: 'SALIH', clue: 'Sent to Thamud' },
    { word: 'CAMEL', clue: 'The miracle' },
    { word: 'ROCK', clue: 'Camel emerged' },
    { word: 'MILK', clue: "Camel's provision" },
  ],
  SHUAIB: [
    { word: 'WOOD', clue: 'Companions of the wood' },
  ],
  LUT: [
    { word: 'LUT', clue: "Ibrahim's nephew" },
    { word: 'LOT', clue: 'English name' },
    { word: 'SODOM', clue: 'Sinful city' },
    { word: 'STONE', clue: 'Rained on them' },
  ],
  YAHYA: [
    { word: 'YAHYA', clue: "Zakariya's son" },
    { word: 'JOHN', clue: 'English name' },
    { word: 'SON', clue: 'To Zakariya' },
    { word: 'WEPT', clue: 'In fear of Allah' },
  ],
  ZAKARIYA: [
    { word: 'YAHYA', clue: 'His son' },
    { word: 'JOHN', clue: "Son's English name" },
    { word: 'FRUIT', clue: "Maryam's provision" },
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
  DHUL_KIFL: [
    { word: 'KIFL', clue: 'Part of his name' },
    { word: 'FOLD', clue: 'Meaning of Kifl' },
    { word: 'FAST', clue: 'He fasted daily' },
    { word: 'PRAY', clue: 'He prayed nightly' },
    { word: 'SABR', clue: 'His patience' },
  ],
  ILYAS: [
    { word: 'ILYAS', clue: 'Sent against Baal' },
    { word: 'BAAL', clue: 'Idol worshipped' },
    { word: 'IDOL', clue: 'False god' },
    { word: 'AHAB', clue: 'King of his time' },
  ],
  AL_YASA: [
    { word: 'YASA', clue: 'Part of his name' },
    { word: 'GOOD', clue: 'Among the righteous' },
    { word: 'ELISHA', clue: 'English name' },
  ],
};

const runsPerProphet = 10;
const results: { prophet: string; maxKeywords: number; keywords: string[] }[] = [];

console.log('Running keyword comparison test (10 runs per prophet)...\n');

for (const [prophet, themeWords] of Object.entries(PROPHET_THEMES)) {
  let maxKeywords = 0;
  let bestKeywords: string[] = [];

  for (let i = 0; i < runsPerProphet; i++) {
    const result = generatePuzzle(themeWords, { wordIndex, maxTimeMs: 10000 });

    if (result.success) {
      const placedThemeWords = result.placedWords
        .filter(pw => pw.isThemeWord)
        .map(pw => pw.word);

      if (placedThemeWords.length > maxKeywords) {
        maxKeywords = placedThemeWords.length;
        bestKeywords = placedThemeWords;
      }
    }
  }

  results.push({ prophet, maxKeywords, keywords: bestKeywords });
  process.stdout.write('.');
}

console.log('\n');

// Sort by max keywords descending
results.sort((a, b) => b.maxKeywords - a.maxKeywords);

// Print table
console.log('Maximum Keywords Per Prophet (Valid Complete Puzzles)');
console.log('┌───────────┬──────────────┬──────────────────────────────────┐');
console.log('│  Prophet  │ Max Keywords │     Keywords Placed              │');
console.log('├───────────┼──────────────┼──────────────────────────────────┤');

for (const r of results) {
  const prophet = r.prophet.padEnd(9);
  const max = String(r.maxKeywords).padEnd(12);
  const keywords = r.keywords.length > 0 ? r.keywords.join(', ') : '-';
  console.log(`│ ${prophet} │ ${max} │ ${keywords.padEnd(32)} │`);
}

console.log('└───────────┴──────────────┴──────────────────────────────────┘');

// Summary stats
const total = results.reduce((sum, r) => sum + r.maxKeywords, 0);
const avg = (total / results.length).toFixed(1);
const prophetsWithMultiple = results.filter(r => r.maxKeywords >= 2).length;
const prophetsWithThreeOrMore = results.filter(r => r.maxKeywords >= 3).length;

console.log('\nSummary:');
console.log(`  Total keywords across all prophets: ${total}`);
console.log(`  Average keywords per prophet: ${avg}`);
console.log(`  Prophets with 2+ keywords: ${prophetsWithMultiple}/25`);
console.log(`  Prophets with 3+ keywords: ${prophetsWithThreeOrMore}/25`);
console.log(`  Prophets with 0 keywords: ${results.filter(r => r.maxKeywords === 0).length}/25`);
