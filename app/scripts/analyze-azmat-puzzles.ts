/**
 * Analyze Azmat's Puzzles - Extract stats and benchmarks
 *
 * This script analyzes all 34 existing puzzles to understand:
 * - Islamic vs English word ratios
 * - Keyword patterns per prophet
 * - Clue styles and difficulty
 * - Grid patterns and black square placement
 */

import * as fs from 'fs';
import * as path from 'path';

// Islamic words from our word-list-full.ts
const ISLAMIC_WORDS = new Set([
  // Prophets and related
  'ADAM', 'NUH', 'HUD', 'ISA', 'MUSA', 'ARK', 'AXE', 'CALF', 'CLAY', 'CROW',
  'FIRE', 'FISH', 'IRON', 'JUDI', 'NILE', 'WELL', 'WIND', 'AYYUB', 'DAWUD',
  'HARUN', 'HAWWA', 'IBLIS', 'IDRIS', 'ILYAS', 'INJIL', 'ISHAQ', 'JALUT',
  'KHIDR', 'MANNA', 'QABIL', 'SALIH', 'SARAH', 'STAFF', 'TORAH', 'WHALE',
  'YAHYA', 'YAQUB', 'YUNUS', 'YUSUF', 'ZABUR', 'HAGAR', 'HABIL', 'BURAQ',
  'DREAM', 'EGYPT', 'JESUS', 'MOSES', 'NOAH', 'MARY', 'JOB', 'JOHN',
  'JONAH', 'JACOB', 'DAVID', 'AARON', 'LOT', 'JINN',
  'LUT', 'SETH', 'ISAAC', 'SALEH', 'EDEN', 'SODOM', 'SINAI', 'SHEBA',
  'BAAL', 'IDOLS', 'DATES', 'ANTS', 'QUAKE', 'HEROD', 'ARAB',
  // Names of Allah
  'ALLAH', 'RAHMAN', 'RAHIM', 'MALIK', 'SALAM', 'AZIZ', 'KHALIQ', 'GHAFUR',
  'WAHAB', 'RAZZAQ', 'ALIM', 'SAMI', 'BASIR', 'HAKIM', 'WADUD', 'MAJID',
  'HAQQ', 'WAKIL', 'QADIR', 'AHAD', 'NUR', 'HADI', 'QAYYUM',
  'ARSH', 'HUKM', 'FIQH', 'AMMA',
  // General Islamic terms
  'QURAN', 'SALAH', 'HAJJ', 'DUA', 'EID', 'FAJR', 'IQRA', 'HIRA', 'KAABA',
  'HIJRA', 'DHIKR', 'IMAM', 'MECCA', 'ISLAM', 'SAWM', 'TAWAF', 'WUDU',
  'HALAL', 'HARAM', 'SUNNI', 'SURAH', 'JIHAD', 'TAQWA', 'UMMAH', 'UMRAH',
  'FATWA', 'HAFIZ', 'GHUSL', 'IHRAM', 'IHSAN', 'MIRAJ', 'SHIRK', 'DAWAH',
  'DHUHR', 'SABR', 'NAFL', 'ISHA', 'ASR', 'BADR', 'UHUD', 'ANSAR',
  'ISRA', 'ADHA', 'SAFA', 'MARWA', 'ZAKA',
  // Companions and others
  'ALI', 'UMAR', 'AISHA', 'BILAL', 'HAMZA', 'OMAR', 'ABBAS',
  'ASMA', 'ASIYA', 'QASIM', 'SAUDI', 'AYKAH',
  // Additional Islamic-themed words often in puzzles
  'MUFTI', 'JAIL', 'TRIAL', 'COAT', 'WOLF', 'ENOCH', 'DEMON',
  'MUSIC', 'OMIT', 'CAMEL', 'SHEM', 'GOAT', 'FORTY', 'FLOOD',
  'BIRDS', 'RAVEN', 'OLIVE', 'TOWER', 'BABEL', 'SHIP', 'BEAST',
  'ANGEL', 'GLORY', 'PEACE', 'MERCY', 'GRACE', 'FAITH', 'PRAY',
  'FAST', 'TRUST', 'GUIDE', 'LIGHT', 'TRUTH', 'SOUL', 'HEART',
]);

// Extended Islamic context words (related to Islamic themes but not exclusively Islamic)
const ISLAMIC_CONTEXT_WORDS = new Set([
  'KING', 'QUEEN', 'SLAVE', 'DREAM', 'VISION', 'STAFF', 'ROPE', 'FIRE',
  'WATER', 'EARTH', 'WELL', 'CAVE', 'MOUNT', 'RIVER', 'SEA', 'RAIN',
  'SUN', 'MOON', 'STAR', 'NIGHT', 'DAY', 'YEAR', 'EAST', 'WEST',
  'NORTH', 'SOUTH', 'GOLD', 'IRON', 'WOOD', 'STONE', 'BREAD', 'WINE',
  'OIL', 'HONEY', 'MILK', 'GRAIN', 'FRUIT', 'TREE', 'BIRD', 'FISH',
  'LION', 'LAMB', 'GOAT', 'SHEEP', 'HORSE', 'CAMEL', 'ANT', 'BEE',
  'SON', 'FATHER', 'MOTHER', 'WIFE', 'CHILD', 'TRIBE', 'PEOPLE',
  'LORD', 'GOD', 'ANGEL', 'DEVIL', 'SPIRIT', 'SOUL', 'DEATH', 'LIFE',
]);

interface IPUZPuzzle {
  version: string;
  kind: string[];
  title: string;
  author: string;
  copyright: string;
  notes: string;
  puzzle: string[][];
  solution: (string | null)[][];
  clues: {
    Across: [number, string][];
    Down: [number, string][];
  };
  dimensions: {
    width: number;
    height: number;
  };
}

interface WordInfo {
  word: string;
  direction: 'across' | 'down';
  row: number;
  col: number;
  clue: string;
  clueNumber: number;
  isIslamic: boolean;
  isIslamicContext: boolean;
}

interface PuzzleAnalysis {
  puzzleNumber: number;
  title: string;
  author: string;
  dimensions: { width: number; height: number };
  totalWords: number;
  islamicWords: WordInfo[];
  islamicContextWords: WordInfo[];
  englishWords: WordInfo[];
  islamicPercentage: number;
  islamicPlusContextPercentage: number;
  blackSquares: number;
  blackSquarePattern: string;
  clueStyles: {
    questionMark: number;      // Clues ending with ?
    quotation: number;         // Clues with quotes
    abbreviation: number;      // Clues with (abbr.) or similar
    fillInBlank: number;       // Clues with ___
    reference: number;         // Clues referencing other clues (1A, 2D, etc.)
    quranReference: number;    // Clues with Q. or Quran references
    simple: number;            // Simple definition clues
  };
  keywords: string[];          // Prophet/theme-specific keywords
}

function extractWordsFromGrid(puzzle: IPUZPuzzle): WordInfo[] {
  const words: WordInfo[] = [];
  const { solution, puzzle: puzzleGrid, clues, dimensions } = puzzle;

  // Build clue lookup
  const acrossClues = new Map<number, string>();
  const downClues = new Map<number, string>();

  for (const [num, clue] of clues.Across) {
    acrossClues.set(num, clue);
  }
  for (const [num, clue] of clues.Down) {
    downClues.set(num, clue);
  }

  // Extract across words
  for (let row = 0; row < dimensions.height; row++) {
    let wordStart = -1;
    let currentWord = '';
    let clueNum = 0;

    for (let col = 0; col <= dimensions.width; col++) {
      const cell = col < dimensions.width ? solution[row][col] : null;
      const puzzleCell = col < dimensions.width ? puzzleGrid[row][col] : '#';

      if (cell && cell !== null) {
        if (wordStart === -1) {
          wordStart = col;
          const num = parseInt(puzzleCell);
          if (!isNaN(num) && num > 0) {
            clueNum = num;
          }
        }
        currentWord += cell;
      } else {
        if (currentWord.length >= 2) {
          const clue = acrossClues.get(clueNum) || '';
          words.push({
            word: currentWord,
            direction: 'across',
            row,
            col: wordStart,
            clue,
            clueNumber: clueNum,
            isIslamic: ISLAMIC_WORDS.has(currentWord),
            isIslamicContext: ISLAMIC_CONTEXT_WORDS.has(currentWord),
          });
        }
        wordStart = -1;
        currentWord = '';
        clueNum = 0;
      }
    }
  }

  // Extract down words
  for (let col = 0; col < dimensions.width; col++) {
    let wordStart = -1;
    let currentWord = '';
    let clueNum = 0;

    for (let row = 0; row <= dimensions.height; row++) {
      const cell = row < dimensions.height ? solution[row][col] : null;
      const puzzleCell = row < dimensions.height ? puzzleGrid[row][col] : '#';

      if (cell && cell !== null) {
        if (wordStart === -1) {
          wordStart = row;
          const num = parseInt(puzzleCell);
          if (!isNaN(num) && num > 0) {
            clueNum = num;
          }
        }
        currentWord += cell;
      } else {
        if (currentWord.length >= 2) {
          const clue = downClues.get(clueNum) || '';
          words.push({
            word: currentWord,
            direction: 'down',
            row: wordStart,
            col,
            clue,
            clueNumber: clueNum,
            isIslamic: ISLAMIC_WORDS.has(currentWord),
            isIslamicContext: ISLAMIC_CONTEXT_WORDS.has(currentWord),
          });
        }
        wordStart = -1;
        currentWord = '';
        clueNum = 0;
      }
    }
  }

  return words;
}

function analyzeClueStyle(clue: string): string[] {
  const styles: string[] = [];

  if (clue.endsWith('?')) styles.push('questionMark');
  if (clue.includes('"') || clue.includes("'")) styles.push('quotation');
  if (clue.includes('(abbr') || clue.includes('(init') || clue.includes('abbr.')) styles.push('abbreviation');
  if (clue.includes('___') || clue.includes('_')) styles.push('fillInBlank');
  if (/\d+[AD]/.test(clue)) styles.push('reference');
  if (clue.includes('Q.') || clue.toLowerCase().includes('quran') || clue.toLowerCase().includes('surah')) styles.push('quranReference');
  if (styles.length === 0) styles.push('simple');

  return styles;
}

function getBlackSquarePattern(puzzle: IPUZPuzzle): string {
  const { puzzle: puzzleGrid, dimensions } = puzzle;
  let pattern = '';

  for (let row = 0; row < dimensions.height; row++) {
    for (let col = 0; col < dimensions.width; col++) {
      pattern += puzzleGrid[row][col] === '#' ? '#' : '.';
    }
    if (row < dimensions.height - 1) pattern += '\n';
  }

  return pattern;
}

function countBlackSquares(puzzle: IPUZPuzzle): number {
  let count = 0;
  for (const row of puzzle.puzzle) {
    for (const cell of row) {
      if (cell === '#') count++;
    }
  }
  return count;
}

function analyzePuzzle(puzzleNumber: number, puzzlePath: string): PuzzleAnalysis | null {
  try {
    const content = fs.readFileSync(puzzlePath, 'utf-8');
    const puzzle: IPUZPuzzle = JSON.parse(content);

    const words = extractWordsFromGrid(puzzle);
    const islamicWords = words.filter(w => w.isIslamic);
    const islamicContextWords = words.filter(w => !w.isIslamic && w.isIslamicContext);
    const englishWords = words.filter(w => !w.isIslamic && !w.isIslamicContext);

    // Analyze clue styles
    const clueStyles = {
      questionMark: 0,
      quotation: 0,
      abbreviation: 0,
      fillInBlank: 0,
      reference: 0,
      quranReference: 0,
      simple: 0,
    };

    for (const word of words) {
      const styles = analyzeClueStyle(word.clue);
      for (const style of styles) {
        if (style in clueStyles) {
          clueStyles[style as keyof typeof clueStyles]++;
        }
      }
    }

    // Extract keywords (Islamic words that are likely theme-specific)
    const keywords = islamicWords
      .filter(w => w.word.length >= 3)
      .map(w => w.word);

    return {
      puzzleNumber,
      title: puzzle.title,
      author: puzzle.author,
      dimensions: puzzle.dimensions,
      totalWords: words.length,
      islamicWords,
      islamicContextWords,
      englishWords,
      islamicPercentage: (islamicWords.length / words.length) * 100,
      islamicPlusContextPercentage: ((islamicWords.length + islamicContextWords.length) / words.length) * 100,
      blackSquares: countBlackSquares(puzzle),
      blackSquarePattern: getBlackSquarePattern(puzzle),
      clueStyles,
      keywords,
    };
  } catch (error) {
    console.error(`Error analyzing puzzle ${puzzleNumber}:`, error);
    return null;
  }
}

function findIPUZFile(dir: string): string | null {
  const files = fs.readdirSync(dir);
  const ipuzFile = files.find(f => f.endsWith('.ipuz'));
  return ipuzFile ? path.join(dir, ipuzFile) : null;
}

// Main analysis
const puzzlesDir = '/Users/josh/code/crosswords/puzzles';
const analyses: PuzzleAnalysis[] = [];

// Get all puzzle directories
const dirs = fs.readdirSync(puzzlesDir)
  .filter(d => /^\d+$/.test(d))
  .sort((a, b) => parseInt(a) - parseInt(b));

console.log('='.repeat(80));
console.log('AZMAT PUZZLE ANALYSIS - BENCHMARKS FOR ISLAMIC CROSSWORD GENERATION');
console.log('='.repeat(80));
console.log();

for (const dir of dirs) {
  const puzzleDir = path.join(puzzlesDir, dir);
  const ipuzPath = findIPUZFile(puzzleDir);

  if (ipuzPath) {
    const analysis = analyzePuzzle(parseInt(dir), ipuzPath);
    if (analysis) {
      analyses.push(analysis);
    }
  }
}

// Print individual puzzle summaries
console.log('INDIVIDUAL PUZZLE ANALYSIS');
console.log('-'.repeat(80));

for (const a of analyses) {
  console.log(`\n#${a.puzzleNumber.toString().padStart(2, '0')} - ${a.title}`);
  console.log(`   Words: ${a.totalWords} | Islamic: ${a.islamicWords.length} (${a.islamicPercentage.toFixed(1)}%) | Context: ${a.islamicContextWords.length} | English: ${a.englishWords.length}`);
  console.log(`   Black squares: ${a.blackSquares}`);
  console.log(`   Islamic words: ${a.islamicWords.map(w => w.word).join(', ')}`);
  console.log(`   English fillers: ${a.englishWords.map(w => w.word).join(', ')}`);
}

// Aggregate statistics
console.log('\n' + '='.repeat(80));
console.log('AGGREGATE STATISTICS');
console.log('='.repeat(80));

const totalPuzzles = analyses.length;
const avgWords = analyses.reduce((sum, a) => sum + a.totalWords, 0) / totalPuzzles;
const avgIslamicPct = analyses.reduce((sum, a) => sum + a.islamicPercentage, 0) / totalPuzzles;
const avgIslamicPlusContextPct = analyses.reduce((sum, a) => sum + a.islamicPlusContextPercentage, 0) / totalPuzzles;
const avgBlackSquares = analyses.reduce((sum, a) => sum + a.blackSquares, 0) / totalPuzzles;

console.log(`\nTotal puzzles analyzed: ${totalPuzzles}`);
console.log(`Average words per puzzle: ${avgWords.toFixed(1)}`);
console.log(`Average Islamic percentage: ${avgIslamicPct.toFixed(1)}%`);
console.log(`Average Islamic+Context percentage: ${avgIslamicPlusContextPct.toFixed(1)}%`);
console.log(`Average black squares: ${avgBlackSquares.toFixed(1)}`);

// Distribution analysis
console.log('\n' + '-'.repeat(40));
console.log('ISLAMIC PERCENTAGE DISTRIBUTION');
console.log('-'.repeat(40));

const below30 = analyses.filter(a => a.islamicPercentage < 30).length;
const between30and50 = analyses.filter(a => a.islamicPercentage >= 30 && a.islamicPercentage < 50).length;
const between50and70 = analyses.filter(a => a.islamicPercentage >= 50 && a.islamicPercentage < 70).length;
const above70 = analyses.filter(a => a.islamicPercentage >= 70).length;

console.log(`< 30%: ${below30} puzzles (${(below30/totalPuzzles*100).toFixed(1)}%)`);
console.log(`30-50%: ${between30and50} puzzles (${(between30and50/totalPuzzles*100).toFixed(1)}%)`);
console.log(`50-70%: ${between50and70} puzzles (${(between50and70/totalPuzzles*100).toFixed(1)}%)`);
console.log(`> 70%: ${above70} puzzles (${(above70/totalPuzzles*100).toFixed(1)}%)`);

// Most common keywords
console.log('\n' + '-'.repeat(40));
console.log('MOST COMMON ISLAMIC KEYWORDS');
console.log('-'.repeat(40));

const keywordCounts: Record<string, number> = {};
for (const a of analyses) {
  for (const kw of a.keywords) {
    keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
  }
}

const sortedKeywords = Object.entries(keywordCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);

for (const [word, count] of sortedKeywords) {
  console.log(`${word.padEnd(12)} ${count} times`);
}

// Most common English fillers
console.log('\n' + '-'.repeat(40));
console.log('MOST COMMON ENGLISH FILLERS');
console.log('-'.repeat(40));

const englishCounts: Record<string, number> = {};
for (const a of analyses) {
  for (const w of a.englishWords) {
    englishCounts[w.word] = (englishCounts[w.word] || 0) + 1;
  }
}

const sortedEnglish = Object.entries(englishCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);

for (const [word, count] of sortedEnglish) {
  console.log(`${word.padEnd(12)} ${count} times`);
}

// Clue style analysis
console.log('\n' + '-'.repeat(40));
console.log('CLUE STYLE BREAKDOWN');
console.log('-'.repeat(40));

const totalClueStyles = {
  questionMark: 0,
  quotation: 0,
  abbreviation: 0,
  fillInBlank: 0,
  reference: 0,
  quranReference: 0,
  simple: 0,
};

for (const a of analyses) {
  for (const key of Object.keys(totalClueStyles) as (keyof typeof totalClueStyles)[]) {
    totalClueStyles[key] += a.clueStyles[key];
  }
}

const totalClues = Object.values(totalClueStyles).reduce((a, b) => a + b, 0);

console.log(`Question mark (?): ${totalClueStyles.questionMark} (${(totalClueStyles.questionMark/totalClues*100).toFixed(1)}%)`);
console.log(`Quotation marks: ${totalClueStyles.quotation} (${(totalClueStyles.quotation/totalClues*100).toFixed(1)}%)`);
console.log(`Abbreviation hints: ${totalClueStyles.abbreviation} (${(totalClueStyles.abbreviation/totalClues*100).toFixed(1)}%)`);
console.log(`Fill-in-blank (___): ${totalClueStyles.fillInBlank} (${(totalClueStyles.fillInBlank/totalClues*100).toFixed(1)}%)`);
console.log(`Cross-references: ${totalClueStyles.reference} (${(totalClueStyles.reference/totalClues*100).toFixed(1)}%)`);
console.log(`Quran references: ${totalClueStyles.quranReference} (${(totalClueStyles.quranReference/totalClues*100).toFixed(1)}%)`);
console.log(`Simple definitions: ${totalClueStyles.simple} (${(totalClueStyles.simple/totalClues*100).toFixed(1)}%)`);

// Black square patterns
console.log('\n' + '-'.repeat(40));
console.log('BLACK SQUARE PATTERNS');
console.log('-'.repeat(40));

const patternCounts: Record<string, number> = {};
for (const a of analyses) {
  patternCounts[a.blackSquarePattern] = (patternCounts[a.blackSquarePattern] || 0) + 1;
}

const sortedPatterns = Object.entries(patternCounts)
  .sort((a, b) => b[1] - a[1]);

console.log(`Unique patterns: ${sortedPatterns.length}`);
console.log('\nMost common patterns:');
for (const [pattern, count] of sortedPatterns.slice(0, 5)) {
  console.log(`\nUsed ${count} time(s):`);
  console.log(pattern.split('\n').map(row => '  ' + row).join('\n'));
}

// Words we might be missing
console.log('\n' + '='.repeat(80));
console.log('POTENTIAL MISSING KEYWORDS');
console.log('(Words Azmat uses that we might not have in our system)');
console.log('='.repeat(80));

const allAzmatWords = new Set<string>();
for (const a of analyses) {
  for (const w of [...a.islamicWords, ...a.islamicContextWords, ...a.englishWords]) {
    allAzmatWords.add(w.word);
  }
}

// Find words that appear in Azmat's puzzles with Islamic clues but aren't in our ISLAMIC_WORDS
console.log('\nWords with Islamic-themed clues not in our Islamic word list:');
for (const a of analyses) {
  for (const w of a.englishWords) {
    // Check if the clue suggests Islamic content
    const islamicClueIndicators = ['prophet', 'allah', 'quran', 'islam', 'muslim', 'mecca', 'surah', 'ummah', 'hajj'];
    const clueLC = w.clue.toLowerCase();
    if (islamicClueIndicators.some(ind => clueLC.includes(ind))) {
      console.log(`  ${w.word}: "${w.clue}" (Puzzle #${a.puzzleNumber})`);
    }
  }
}

// Prophet-specific keyword analysis
console.log('\n' + '='.repeat(80));
console.log('PROPHET-SPECIFIC KEYWORD ANALYSIS');
console.log('='.repeat(80));

const prophetPuzzles: Record<string, PuzzleAnalysis[]> = {};
for (const a of analyses) {
  const titleLC = a.title.toLowerCase();
  let prophet = 'general';

  if (titleLC.includes('adam')) prophet = 'adam';
  else if (titleLC.includes('nuh') || titleLC.includes('noah')) prophet = 'nuh';
  else if (titleLC.includes('yusuf') || titleLC.includes('joseph')) prophet = 'yusuf';
  else if (titleLC.includes('ibrahim') || titleLC.includes('abraham')) prophet = 'ibrahim';
  else if (titleLC.includes('musa') || titleLC.includes('moses')) prophet = 'musa';
  else if (titleLC.includes('saleh') || titleLC.includes('salih')) prophet = 'saleh';
  else if (titleLC.includes('muhammad')) prophet = 'muhammad';

  if (!prophetPuzzles[prophet]) prophetPuzzles[prophet] = [];
  prophetPuzzles[prophet].push(a);
}

for (const [prophet, puzzles] of Object.entries(prophetPuzzles)) {
  console.log(`\n${prophet.toUpperCase()} (${puzzles.length} puzzles):`);

  const prophetKeywords: Record<string, number> = {};
  for (const p of puzzles) {
    for (const kw of p.keywords) {
      prophetKeywords[kw] = (prophetKeywords[kw] || 0) + 1;
    }
  }

  const sorted = Object.entries(prophetKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log(`  Keywords: ${sorted.map(([w, c]) => `${w}(${c})`).join(', ')}`);
}

// Summary recommendations
console.log('\n' + '='.repeat(80));
console.log('RECOMMENDATIONS FOR OUR GENERATOR');
console.log('='.repeat(80));

console.log(`
1. TARGET ISLAMIC PERCENTAGE: ${avgIslamicPct.toFixed(0)}% (Azmat's average)
   - Our current target of 50% is reasonable
   - ${between50and70 + above70} of ${totalPuzzles} puzzles (${((between50and70+above70)/totalPuzzles*100).toFixed(0)}%) meet 50%+ threshold

2. WORD COUNT: Target ${Math.round(avgWords)} words per puzzle
   - Range: ${Math.min(...analyses.map(a => a.totalWords))} to ${Math.max(...analyses.map(a => a.totalWords))}

3. BLACK SQUARES: Average ${avgBlackSquares.toFixed(1)} per 5x5 grid
   - Most common: ${Math.round(avgBlackSquares)} black squares

4. TOP KEYWORDS TO PRIORITIZE:
   ${sortedKeywords.slice(0, 10).map(([w]) => w).join(', ')}

5. USEFUL ENGLISH FILLERS:
   ${sortedEnglish.slice(0, 10).map(([w]) => w).join(', ')}

6. CLUE VARIETY: Mix different styles
   - ${(totalClueStyles.simple/totalClues*100).toFixed(0)}% simple definitions
   - ${(totalClueStyles.quranReference/totalClues*100).toFixed(0)}% Quran references
   - ${(totalClueStyles.questionMark/totalClues*100).toFixed(0)}% wordplay (?)
   - ${(totalClueStyles.fillInBlank/totalClues*100).toFixed(0)}% fill-in-blank
`);

// Export data for further analysis
const exportData = {
  summary: {
    totalPuzzles,
    avgWords,
    avgIslamicPct,
    avgIslamicPlusContextPct,
    avgBlackSquares,
  },
  distribution: {
    below30,
    between30and50,
    between50and70,
    above70,
  },
  topKeywords: sortedKeywords,
  topEnglishFillers: sortedEnglish,
  clueStyles: totalClueStyles,
  prophetBreakdown: Object.fromEntries(
    Object.entries(prophetPuzzles).map(([prophet, puzzles]) => [
      prophet,
      {
        count: puzzles.length,
        avgIslamicPct: puzzles.reduce((sum, p) => sum + p.islamicPercentage, 0) / puzzles.length,
      },
    ])
  ),
  allPuzzles: analyses.map(a => ({
    number: a.puzzleNumber,
    title: a.title,
    totalWords: a.totalWords,
    islamicPct: a.islamicPercentage,
    islamicWords: a.islamicWords.map(w => w.word),
    englishWords: a.englishWords.map(w => w.word),
    blackSquares: a.blackSquares,
  })),
};

const outputPath = '/Users/josh/code/crosswords/app/scripts/azmat-analysis.json';
fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
console.log(`\nFull analysis data exported to: ${outputPath}`);
