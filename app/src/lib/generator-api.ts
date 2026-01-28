import { ThemeWord, GeneratedPuzzle, PuzzleStatistics, FillerSuggestion } from './types';
import { sampleWords } from './sample-data';

// Common English filler words that work well in crosswords
const commonFillerWords: { word: string; clue: string; score: number }[] = [
  { word: 'PEACE', clue: 'Tranquility; what Salam means', score: 95 },
  { word: 'LIGHT', clue: 'What guides believers; opposite of darkness', score: 90 },
  { word: 'TRUTH', clue: 'What prophets taught', score: 90 },
  { word: 'FAITH', clue: 'Belief in the unseen', score: 95 },
  { word: 'GRACE', clue: 'Divine favor', score: 85 },
  { word: 'MERCY', clue: 'Compassion; attribute of Allah', score: 95 },
  { word: 'HOPE', clue: 'Expectation of good', score: 85 },
  { word: 'LOVE', clue: 'Deep affection', score: 85 },
  { word: 'WISE', clue: 'Having wisdom', score: 80 },
  { word: 'JUST', clue: 'Fair; righteous', score: 85 },
  { word: 'PURE', clue: 'Clean; untainted', score: 85 },
  { word: 'SOUL', clue: 'The ruh within us', score: 90 },
  { word: 'GOOD', clue: 'Opposite of evil', score: 80 },
  { word: 'KIND', clue: 'Gentle and caring', score: 85 },
  { word: 'PRAY', clue: 'To worship', score: 90 },
  { word: 'FAST', clue: 'To abstain from food', score: 90 },
  { word: 'GIVE', clue: 'To donate; charity', score: 85 },
  { word: 'READ', clue: 'First command to Prophet Muhammad (SAW)', score: 95 },
  { word: 'SEEK', clue: 'To search for knowledge', score: 85 },
  { word: 'PATH', clue: 'The straight ___; Sirat', score: 90 },
  { word: 'GUIDE', clue: 'One who shows the way', score: 85 },
  { word: 'BLESS', clue: 'To bestow divine favor', score: 90 },
  { word: 'NOBLE', clue: 'Having high moral qualities', score: 85 },
  { word: 'HUMBLE', clue: 'Not proud or arrogant', score: 90 },
  { word: 'PATIENT', clue: 'Having sabr', score: 95 },
  { word: 'GRATEFUL', clue: 'Feeling thankful; shukr', score: 95 },
  { word: 'WORSHIP', clue: 'Ibadah; to serve Allah', score: 95 },
  { word: 'BLESSED', clue: 'Divinely favored', score: 90 },
  { word: 'KINGDOM', clue: 'Dominion; Allah\'s mulk', score: 85 },
  { word: 'MERCIFUL', clue: 'Full of compassion; Ar-Rahim', score: 95 },
];

interface GeneratePuzzleOptions {
  title?: string;
  author?: string;
  targetWords?: number;
  themeWords: ThemeWord[];
}

/**
 * Calls the Python crossword generator with theme words.
 * In development, this simulates the API call.
 * In production, this would call a backend API or serverless function.
 */
export async function generatePuzzle(options: GeneratePuzzleOptions): Promise<GeneratedPuzzle> {
  const { title = 'Islamic Crossword', author = 'myislam.org', themeWords, targetWords = 7 } = options;

  // For now, simulate the puzzle generation
  // In production, this would call the Python generator via API
  return simulateGeneration(title, author, themeWords, targetWords);
}

/**
 * Simulates puzzle generation for development.
 * Returns a plausible puzzle layout based on the theme words.
 */
function simulateGeneration(
  title: string,
  author: string,
  themeWords: ThemeWord[],
  targetWords: number
): GeneratedPuzzle {
  // Sort words by length (longer words first for better placement)
  const sortedWords = [...themeWords].sort((a, b) => b.activeSpelling.length - a.activeSpelling.length);

  // Simulate which words could be placed (typically 60-80% success rate)
  const placementRate = 0.7 + Math.random() * 0.2;
  const placedCount = Math.min(
    Math.ceil(sortedWords.length * placementRate),
    targetWords
  );

  const placedWords = sortedWords.slice(0, placedCount);
  const unplacedWords = sortedWords.slice(placedCount);

  // Build a simple simulated grid
  const gridSize = Math.max(12, Math.ceil(Math.max(...placedWords.map(w => w.activeSpelling.length)) * 1.5));
  const grid: GeneratedPuzzle['grid'] = [];

  // Initialize empty grid
  for (let r = 0; r < gridSize; r++) {
    const row: GeneratedPuzzle['grid'][0] = [];
    for (let c = 0; c < gridSize; c++) {
      row.push({ type: 'empty' });
    }
    grid.push(row);
  }

  // Place words in a simple pattern for simulation
  const acrossClues: GeneratedPuzzle['clues']['across'] = [];
  const downClues: GeneratedPuzzle['clues']['down'] = [];
  let clueNumber = 1;

  placedWords.forEach((word, index) => {
    const spelling = word.activeSpelling.toUpperCase();
    const isAcross = index % 2 === 0;

    if (isAcross) {
      // Place across
      const row = 1 + index;
      const col = 1;

      if (row < gridSize && col + spelling.length <= gridSize) {
        for (let i = 0; i < spelling.length; i++) {
          grid[row][col + i] = {
            type: 'letter',
            solution: spelling[i],
            number: i === 0 ? clueNumber : undefined,
          };
        }

        acrossClues.push({
          number: clueNumber,
          clue: word.clue,
          answer: spelling,
          row,
          col,
          length: spelling.length,
        });
        clueNumber++;
      }
    } else {
      // Place down
      const row = 1;
      const col = 1 + Math.floor(index / 2) * 3;

      if (col < gridSize && row + spelling.length <= gridSize) {
        for (let i = 0; i < spelling.length; i++) {
          const cell = grid[row + i][col];
          // Only place if empty or same letter (intersection)
          if (cell.type === 'empty' || cell.solution === spelling[i]) {
            grid[row + i][col] = {
              type: 'letter',
              solution: spelling[i],
              number: i === 0 ? clueNumber : cell.number,
            };
          }
        }

        downClues.push({
          number: clueNumber,
          clue: word.clue,
          answer: spelling,
          row,
          col,
          length: spelling.length,
        });
        clueNumber++;
      }
    }
  });

  // Compact the grid to remove empty rows/columns
  const compactedGrid = compactGrid(grid);

  // Calculate statistics
  const statistics = calculateStatistics(compactedGrid, placedWords, sortedWords);

  // Generate filler suggestions for unplaced words
  const fillerSuggestions = generateFillerSuggestions(unplacedWords, placedWords);

  return {
    metadata: {
      title,
      author,
      date: new Date().toISOString(),
      rows: compactedGrid.length,
      cols: compactedGrid[0]?.length || 0,
      wordCount: placedWords.length,
    },
    grid: compactedGrid,
    clues: {
      across: acrossClues,
      down: downClues,
    },
    placedWordIds: placedWords.map(w => w.id),
    unplacedWordIds: unplacedWords.map(w => w.id),
    statistics,
    fillerSuggestions,
  };
}

/**
 * Calculate puzzle statistics for quality assessment.
 */
function calculateStatistics(
  grid: GeneratedPuzzle['grid'],
  placedWords: ThemeWord[],
  allWords: ThemeWord[]
): PuzzleStatistics {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const totalCells = rows * cols;

  // Count filled cells and find intersections
  let filledCells = 0;
  let intersectionCells = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].type === 'letter') {
        filledCells++;

        // Simplified intersection detection: check if cell has neighbors in both directions
        const hasHorizontalNeighbor = (c > 0 && grid[r][c - 1].type === 'letter') ||
                                       (c < cols - 1 && grid[r][c + 1].type === 'letter');
        const hasVerticalNeighbor = (r > 0 && grid[r - 1][c].type === 'letter') ||
                                     (r < rows - 1 && grid[r + 1][c].type === 'letter');

        if (hasHorizontalNeighbor && hasVerticalNeighbor) {
          intersectionCells++;
        }
      }
    }
  }

  const placedWordCount = placedWords.length;
  const totalWordCount = allWords.length;

  // Calculate grid connectivity score (simplified Grid Flow)
  // Higher score = more interconnected = more challenging
  // Based on: intersections per word, fill density, word count
  const avgIntersections = placedWordCount > 0 ? intersectionCells / placedWordCount : 0;
  const fillDensity = totalCells > 0 ? filledCells / totalCells : 0;

  // Grid connectivity formula (inspired by Crosserville):
  // Base score from intersections + bonus for density + bonus for word count
  const gridConnectivity = Math.round(
    (avgIntersections * 10) + // Each intersection adds ~10 points
    (fillDensity * 20) +      // Fill density contributes up to 20 points
    (placedWordCount * 2)     // Each word adds 2 points
  );

  return {
    gridFillPercentage: totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0,
    wordPlacementRate: totalWordCount > 0 ? Math.round((placedWordCount / totalWordCount) * 100) : 0,
    totalIntersections: intersectionCells,
    avgIntersectionsPerWord: placedWordCount > 0 ? Math.round(avgIntersections * 10) / 10 : 0,
    gridConnectivity,
    totalCells,
    filledCells,
    placedWordCount,
    totalWordCount,
  };
}

/**
 * Generate filler suggestions for words that couldn't be placed.
 */
function generateFillerSuggestions(
  unplacedWords: ThemeWord[],
  placedWords: ThemeWord[]
): FillerSuggestion[] {
  const placedWordStrings = new Set(placedWords.map(w => w.activeSpelling.toUpperCase()));
  const usedWordIds = new Set(placedWords.map(w => w.id));

  return unplacedWords.map(unplacedWord => {
    const originalLength = unplacedWord.activeSpelling.length;
    const suggestions: FillerSuggestion['suggestions'] = [];

    // Determine reason for not placing
    let reason: FillerSuggestion['reason'] = 'no_fit';
    if (originalLength > 10) {
      reason = 'too_long';
    }

    // Find Islamic word alternatives from sample data
    const islamicAlternatives = sampleWords
      .filter(w =>
        !usedWordIds.has(w.id) &&
        !placedWordStrings.has(w.word.toUpperCase()) &&
        w.word.length >= originalLength - 2 &&
        w.word.length <= originalLength + 2
      )
      .slice(0, 3)
      .map(w => ({
        word: w.word,
        clue: w.clue,
        length: w.word.length,
        score: w.score,
        source: 'islamic' as const,
        arabicScript: w.arabicScript,
      }));

    suggestions.push(...islamicAlternatives);

    // Find common English alternatives
    const commonAlternatives = commonFillerWords
      .filter(w =>
        !placedWordStrings.has(w.word.toUpperCase()) &&
        w.word.length >= originalLength - 2 &&
        w.word.length <= originalLength + 2
      )
      .slice(0, 2)
      .map(w => ({
        word: w.word,
        clue: w.clue,
        length: w.word.length,
        score: w.score,
        source: 'common' as const,
      }));

    suggestions.push(...commonAlternatives);

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);

    // Get spelling variants that might fit better (shorter versions)
    const variants: FillerSuggestion['variants'] = [];
    if (unplacedWord.spellingVariants && unplacedWord.spellingVariants.length > 1) {
      unplacedWord.spellingVariants
        .filter(v => v !== unplacedWord.activeSpelling && v.length < originalLength)
        .forEach(v => {
          variants.push({ word: v, length: v.length });
        });
    }

    return {
      wordId: unplacedWord.id,
      originalWord: unplacedWord.activeSpelling,
      originalLength,
      suggestions: suggestions.slice(0, 5), // Limit to 5 suggestions
      variants: variants.length > 0 ? variants : undefined,
      reason,
    };
  });
}

/**
 * Remove empty rows and columns from the grid edges.
 */
function compactGrid(grid: GeneratedPuzzle['grid']): GeneratedPuzzle['grid'] {
  if (grid.length === 0) return grid;

  // Find bounds
  let minRow = grid.length;
  let maxRow = 0;
  let minCol = grid[0].length;
  let maxCol = 0;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].type === 'letter') {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  // Extract the bounded region
  const compacted: GeneratedPuzzle['grid'] = [];
  for (let r = minRow; r <= maxRow; r++) {
    const row: GeneratedPuzzle['grid'][0] = [];
    for (let c = minCol; c <= maxCol; c++) {
      row.push(grid[r][c]);
    }
    compacted.push(row);
  }

  return compacted.length > 0 ? compacted : [[{ type: 'empty' }]];
}

/**
 * Convert a Word from sample-data to a ThemeWord.
 */
export function wordToThemeWord(word: {
  id: string;
  word: string;
  clue: string;
  arabicScript?: string;
  spellingVariants?: string[];
  category?: 'names-of-allah' | 'prophets' | 'quran' | 'general' | 'companions';
}): ThemeWord {
  return {
    id: word.id,
    word: word.word,
    clue: word.clue,
    arabicScript: word.arabicScript,
    spellingVariants: word.spellingVariants,
    activeSpelling: word.word, // Default to primary spelling
    category: word.category,
  };
}
