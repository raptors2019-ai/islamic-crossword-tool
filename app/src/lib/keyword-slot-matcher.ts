/**
 * Keyword Slot Matcher - Smart Keyword Selection via Compatibility Graph
 *
 * Pre-computes keyword compatibility with black square patterns to find valid
 * keyword combinations BEFORE placement, avoiding the greedy approach's
 * tendency to create unfillable slots.
 *
 * Core Insight: Black squares aren't just obstacles - they CREATE opportunities:
 * - Interrupt long unfillable slots
 * - Create shorter slots that allow orphan keywords to connect
 * - Enable placements that wouldn't work in an open grid
 */

import {
  EditableCell,
  GRID_SIZE,
  createEmptyGrid,
  applyBlackPattern,
  placeWord,
  validateConnectivity,
  BLACK_SQUARE_PATTERNS,
  addSymmetricBlack,
} from './editable-grid';
import {
  SlotInfo,
  getAllSlots,
} from './perpendicular-validator';
import {
  WordIndex,
  matchPattern,
  getDefaultWordIndex,
  isIslamicWord,
  calculateWordFriendliness,
} from './word-index';

// ============================================================================
// KEYWORD COMPATIBILITY ANALYSIS
// ============================================================================

/**
 * Check if two keywords can intersect in a 5x5 grid.
 * Returns all positions where they share a common letter.
 */
export function findKeywordIntersections(
  wordA: string,
  wordB: string
): { posA: number; posB: number; letter: string }[] {
  const upperA = wordA.toUpperCase();
  const upperB = wordB.toUpperCase();
  const intersections: { posA: number; posB: number; letter: string }[] = [];

  for (let i = 0; i < upperA.length; i++) {
    for (let j = 0; j < upperB.length; j++) {
      if (upperA[i] === upperB[j]) {
        intersections.push({ posA: i, posB: j, letter: upperA[i] });
      }
    }
  }

  return intersections;
}

/**
 * Analyze keyword compatibility for a set of keywords.
 * Returns a map showing which keyword pairs can intersect and where.
 */
export function analyzeKeywordCompatibility(
  keywords: string[]
): Map<string, { canIntersect: string[]; intersectionCount: number }> {
  const compatibility = new Map<string, { canIntersect: string[]; intersectionCount: number }>();

  for (const kw of keywords) {
    compatibility.set(kw.toUpperCase(), { canIntersect: [], intersectionCount: 0 });
  }

  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      const kwA = keywords[i].toUpperCase();
      const kwB = keywords[j].toUpperCase();
      const intersections = findKeywordIntersections(kwA, kwB);

      if (intersections.length > 0) {
        compatibility.get(kwA)!.canIntersect.push(kwB);
        compatibility.get(kwA)!.intersectionCount += intersections.length;
        compatibility.get(kwB)!.canIntersect.push(kwA);
        compatibility.get(kwB)!.intersectionCount += intersections.length;
      }
    }
  }

  return compatibility;
}

/**
 * Find keywords that form a connected subgraph (can all potentially interconnect).
 * Uses greedy selection starting from the keyword with most connections.
 */
export function findCompatibleKeywordSubset(
  keywords: string[],
  maxKeywords: number = 5
): string[] {
  const compatibility = analyzeKeywordCompatibility(keywords);

  // Sort by intersection count (most connected first)
  const sorted = [...compatibility.entries()]
    .sort((a, b) => b[1].intersectionCount - a[1].intersectionCount);

  // Greedy selection: start with most connected, add compatible keywords
  const selected: string[] = [];
  const selectedSet = new Set<string>();

  for (const [kw, info] of sorted) {
    if (selected.length >= maxKeywords) break;

    // First keyword is always added
    if (selected.length === 0) {
      selected.push(kw);
      selectedSet.add(kw);
      continue;
    }

    // Check if this keyword can intersect with at least one selected keyword
    const canConnect = info.canIntersect.some(other => selectedSet.has(other));
    if (canConnect) {
      selected.push(kw);
      selectedSet.add(kw);
    }
  }

  return selected;
}

// ============================================================================
// SLOT ASSIGNMENT
// ============================================================================

/**
 * Assignment of a keyword (or null for CSP fill) to a slot
 */
export interface SlotAssignment {
  slot: SlotInfo;
  keyword: string | null; // null = will be filled by CSP
  score: number;
}

/**
 * Candidate pattern + keyword assignment
 */
export interface PatternCandidate {
  patternIndex: number;
  patternName: string;
  assignments: SlotAssignment[];
  themeKeywordsPlaced: number;
  estimatedIslamicPercent: number;
  isFillable: boolean;
  /** Score for ranking candidates: (themeCount × 2) + islamicPercent */
  totalScore: number;
}

/**
 * Generate unique key for a slot
 */
function slotKey(slot: SlotInfo): string {
  return `${slot.direction}-${slot.start.row}-${slot.start.col}`;
}

/**
 * Apply a keyword to a grid at a specific slot position
 */
function placeKeywordInSlot(
  grid: EditableCell[][],
  keyword: string,
  slot: SlotInfo
): EditableCell[][] | null {
  return placeWord(
    grid,
    keyword,
    slot.start.row,
    slot.start.col,
    slot.direction,
    'auto',
    false // Don't preserve - we're building fresh
  );
}

/**
 * Check if a keyword fits in a slot (length match + compatible letters)
 */
function keywordFitsSlot(keyword: string, slot: SlotInfo): boolean {
  if (keyword.length !== slot.length) return false;

  // Check that any fixed letters in the slot match the keyword
  const upper = keyword.toUpperCase();
  for (let i = 0; i < slot.pattern.length; i++) {
    if (slot.pattern[i] !== '_' && slot.pattern[i] !== upper[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Check if intersecting slots still have valid candidates after placing a word.
 * This is a forward-checking step to catch dead ends early.
 *
 * Uses progressive thresholds similar to the greedy algorithm:
 * - For the first 3 placements: skip verification (let them place freely)
 * - After that: require 50%+ of constrained slots to have candidates
 */
function verifyIntersectingSlots(
  grid: EditableCell[][],
  placedSlot: SlotInfo,
  wordIndex: WordIndex,
  placedCount: number = 0
): boolean {
  // Skip verification for first 3 keywords - let them place freely
  // Early placements often look risky but work out
  if (placedCount < 3) return true;

  // Get all slots in the grid
  const allSlots = getAllSlots(grid);

  let slotsChecked = 0;
  let slotsWithCandidates = 0;

  // Find slots that intersect with the placed slot
  for (const slot of allSlots) {
    // Skip the slot we just placed
    if (slotKey(slot) === slotKey(placedSlot)) continue;

    // Skip slots in the same direction (can't intersect)
    if (slot.direction === placedSlot.direction) continue;

    // Skip fully-filled slots
    if (!slot.pattern.includes('_')) continue;

    // Check if this slot intersects with the placed slot
    const intersects = checkSlotsIntersect(placedSlot, slot);
    if (!intersects) continue;

    // Count how many letters are constrained
    const constrainedLetters = slot.pattern.split('').filter(c => c !== '_').length;

    // Only verify slots with 2+ constraints
    // Single-letter constraints can often be fixed with black squares
    if (constrainedLetters < 2) continue;

    slotsChecked++;
    const candidates = matchPattern(slot.pattern, wordIndex);
    if (candidates.length > 0) {
      slotsWithCandidates++;
    }
  }

  // If no significantly-constrained slots, allow the placement
  if (slotsChecked === 0) return true;

  // Progressive threshold: 50% for placements 3-5, 70% for 6+
  const threshold = placedCount < 5 ? 0.5 : 0.7;
  const percentWithCandidates = slotsWithCandidates / slotsChecked;
  return percentWithCandidates >= threshold;
}

/**
 * Check if two slots intersect (share at least one cell)
 */
function checkSlotsIntersect(slotA: SlotInfo, slotB: SlotInfo): boolean {
  // Different directions required for intersection
  if (slotA.direction === slotB.direction) return false;

  // Get cell positions
  const cellsA: [number, number][] = [];
  const cellsB: [number, number][] = [];

  for (let i = 0; i < slotA.length; i++) {
    const r = slotA.direction === 'down' ? slotA.start.row + i : slotA.start.row;
    const c = slotA.direction === 'across' ? slotA.start.col + i : slotA.start.col;
    cellsA.push([r, c]);
  }

  for (let i = 0; i < slotB.length; i++) {
    const r = slotB.direction === 'down' ? slotB.start.row + i : slotB.start.row;
    const c = slotB.direction === 'across' ? slotB.start.col + i : slotB.start.col;
    cellsB.push([r, c]);
  }

  // Check for common cell
  for (const [ra, ca] of cellsA) {
    for (const [rb, cb] of cellsB) {
      if (ra === rb && ca === cb) return true;
    }
  }

  return false;
}

/**
 * Add strategic black squares to break unfillable slots.
 * This is a simplified version that adds blacks at the middle of unfillable slots.
 *
 * @param grid Current grid state
 * @param wordIndex Word index for validation
 * @param themeCells Cells that are part of theme words (cannot be blacked)
 * @param maxBlacks Maximum blacks to add
 * @returns Updated grid
 */
function addStrategicBlacks(
  grid: EditableCell[][],
  wordIndex: WordIndex,
  themeCells: Set<string>,
  maxBlacks: number = 4
): EditableCell[][] {
  let result = grid.map(row => row.map(cell => ({ ...cell })));
  let blacksAdded = 0;
  let changed = true;

  while (changed && blacksAdded < maxBlacks) {
    changed = false;
    const slots = getAllSlots(result);

    for (const slot of slots) {
      // Only process unfilled slots with 0 candidates
      if (!slot.pattern.includes('_')) continue;
      const candidates = matchPattern(slot.pattern, wordIndex);
      if (candidates.length > 0) continue;

      // Find a cell in the middle of the slot to black out
      const midIndex = Math.floor(slot.length / 2);
      const r = slot.direction === 'down' ? slot.start.row + midIndex : slot.start.row;
      const c = slot.direction === 'across' ? slot.start.col + midIndex : slot.start.col;
      const key = `${r}-${c}`;

      // Don't black out theme cells or cells with letters
      if (themeCells.has(key) || result[r][c].letter) continue;

      // Test if adding black maintains connectivity
      const testGrid = addSymmetricBlack(result, r, c);
      if (!validateConnectivity(testGrid)) continue;

      // Apply the black
      result = testGrid;
      blacksAdded++;
      changed = true;
      break;
    }
  }

  return result;
}

/**
 * Verify that enough unfilled slots in the grid can be filled.
 * First tries adding strategic black squares to fix unfillable slots,
 * then checks if 80%+ of remaining slots have candidates.
 *
 * @param grid Grid to check
 * @param wordIndex Word index for validation
 * @param themeCells Cells that shouldn't be blacked out
 * @param minFillablePercent Minimum percentage of slots that must have candidates
 * @returns Object with fillability result and potentially improved grid
 */
function verifyAllSlotsFillable(
  grid: EditableCell[][],
  wordIndex: WordIndex,
  minFillablePercent: number = 0.8,
  themeCells?: Set<string>
): { isFillable: boolean; improvedGrid: EditableCell[][] } {
  // First, try adding strategic blacks to fix unfillable slots
  const improvedGrid = themeCells
    ? addStrategicBlacks(grid, wordIndex, themeCells, 4)
    : grid;

  const slots = getAllSlots(improvedGrid);

  let totalUnfilled = 0;
  let fillable = 0;

  for (const slot of slots) {
    // Skip fully-filled slots
    if (!slot.pattern.includes('_')) continue;

    totalUnfilled++;
    const candidates = matchPattern(slot.pattern, wordIndex);
    if (candidates.length > 0) {
      fillable++;
    }
  }

  // If no unfilled slots, trivially fillable
  if (totalUnfilled === 0) {
    return { isFillable: true, improvedGrid };
  }

  const isFillable = (fillable / totalUnfilled) >= minFillablePercent;
  return { isFillable, improvedGrid };
}

/**
 * Estimate the Islamic percentage after CSP fill
 * based on how many Islamic words are available for each unfilled slot
 */
function estimateIslamicPercent(
  grid: EditableCell[][],
  keywordAssignments: SlotAssignment[],
  wordIndex: WordIndex
): number {
  const slots = getAllSlots(grid);
  let islamicWordCount = 0;
  let totalWords = 0;

  // Count keywords already assigned
  for (const assignment of keywordAssignments) {
    if (assignment.keyword) {
      totalWords++;
      if (isIslamicWord(assignment.keyword)) {
        islamicWordCount++;
      }
    }
  }

  // For unfilled slots, estimate based on Islamic word availability
  const assignedSlotKeys = new Set(
    keywordAssignments.filter(a => a.keyword).map(a => slotKey(a.slot))
  );

  for (const slot of slots) {
    if (assignedSlotKeys.has(slotKey(slot))) continue;
    if (!slot.pattern.includes('_')) {
      // Already filled slot - check if it's Islamic
      totalWords++;
      if (isIslamicWord(slot.pattern)) {
        islamicWordCount++;
      }
      continue;
    }

    // Unfilled slot - estimate likelihood of Islamic fill
    const candidates = matchPattern(slot.pattern, wordIndex);
    if (candidates.length === 0) continue;

    totalWords++;
    const islamicCandidates = candidates.filter(c => isIslamicWord(c));

    // Weight by Islamic candidate ratio (but assume at least some will be Islamic)
    if (islamicCandidates.length > 0) {
      const islamicRatio = islamicCandidates.length / candidates.length;
      // Conservative estimate: assume we'll get about half the theoretical ratio
      islamicWordCount += Math.min(1, islamicRatio * 0.7);
    }
  }

  return totalWords > 0 ? (islamicWordCount / totalWords) * 100 : 0;
}

/**
 * For a grid with a black square pattern applied, find all slots
 * and which theme keywords can fit each slot.
 */
export function analyzePatternSlots(
  patternIndex: number,
  themeKeywords: string[],
  wordIndex: WordIndex
): { slots: SlotInfo[]; keywordFits: Map<string, string[]> } {
  // Create grid with pattern
  let grid = createEmptyGrid();
  grid = applyBlackPattern(grid, patternIndex);

  // Verify connectivity
  if (!validateConnectivity(grid)) {
    return { slots: [], keywordFits: new Map() };
  }

  // Get all slots
  const slots = getAllSlots(grid);

  // Build keyword → compatible slots map
  const keywordFits = new Map<string, string[]>();

  for (const keyword of themeKeywords) {
    const upper = keyword.toUpperCase();
    const fittingSlots: string[] = [];

    for (const slot of slots) {
      if (upper.length === slot.length) {
        fittingSlots.push(slotKey(slot));
      }
    }

    if (fittingSlots.length > 0) {
      keywordFits.set(upper, fittingSlots);
    }
  }

  return { slots, keywordFits };
}

/**
 * Try to assign theme keywords to slots in a pattern.
 * Uses constraint propagation: when a keyword is assigned,
 * intersecting slots are updated with the fixed letter.
 */
export function assignKeywordsToPattern(
  patternIndex: number,
  themeKeywords: string[],
  wordIndex: WordIndex
): PatternCandidate | null {
  // Create grid with pattern
  let grid = createEmptyGrid();
  grid = applyBlackPattern(grid, patternIndex);

  // Verify connectivity
  if (!validateConnectivity(grid)) {
    return null;
  }

  // Get all slots
  const slots = getAllSlots(grid);

  if (slots.length === 0) {
    return null;
  }

  // Build keyword → compatible slots map
  // Filter to keywords that fit within grid size
  const validKeywords = themeKeywords
    .map(k => k.toUpperCase())
    .filter(k => k.length >= 2 && k.length <= GRID_SIZE);

  const keywordSlots = new Map<string, SlotInfo[]>();
  for (const kw of validKeywords) {
    const compatible = slots.filter(s => s.length === kw.length);
    if (compatible.length > 0) {
      keywordSlots.set(kw, compatible);
    }
  }

  // Analyze keyword compatibility - which keywords can actually intersect?
  const compatibility = analyzeKeywordCompatibility([...keywordSlots.keys()]);

  // Sort keywords by: compatibility count > friendliness > length
  // Keywords that can connect with more others should be placed first
  const sortedKeywords = [...keywordSlots.keys()].sort((a, b) => {
    const compatA = compatibility.get(a)?.intersectionCount ?? 0;
    const compatB = compatibility.get(b)?.intersectionCount ?? 0;

    // Primary: more intersection potential = place first (creates more connection points)
    if (compatA !== compatB) {
      return compatB - compatA;
    }

    // Secondary: friendliness
    const friendA = calculateWordFriendliness(a);
    const friendB = calculateWordFriendliness(b);
    const penaltyA = Math.max(0, (a.length - 3) * 5);
    const penaltyB = Math.max(0, (b.length - 3) * 5);
    const scoreA = friendA - penaltyA;
    const scoreB = friendB - penaltyB;

    if (Math.abs(scoreA - scoreB) > 5) {
      return scoreB - scoreA;
    }

    // Tiebreaker: prefer longer words (more impact)
    return b.length - a.length;
  });

  // Greedy assignment with propagation
  const assignments: SlotAssignment[] = [];
  const usedSlots = new Set<string>();
  let currentGrid = grid;

  // Track direction counts for alternation
  let acrossCount = 0;
  let downCount = 0;

  for (const keyword of sortedKeywords) {
    const compatibleSlots = keywordSlots.get(keyword)!
      .filter(s => !usedSlots.has(slotKey(s)));

    // Prefer the direction we have fewer of (for balance)
    const preferDirection: 'across' | 'down' = acrossCount <= downCount ? 'across' : 'down';

    // Sort compatible slots by:
    // 1. Direction balance (prefer the less-used direction)
    // 2. Intersections with already-placed words (more = better)
    // 3. Central position (closer to center = better)
    const scoredSlots = compatibleSlots.map(slot => {
      let score = 0;

      // Direction balance bonus - strongly prefer the less-used direction
      if (slot.direction === preferDirection) {
        score += 50;
      }

      // Count intersections with filled cells (very important for connectivity)
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === 'down' ? slot.start.row + i : slot.start.row;
        const c = slot.direction === 'across' ? slot.start.col + i : slot.start.col;
        if (currentGrid[r][c].letter) {
          score += 20; // Boost intersection score
        }
      }

      // Central position bonus
      const centerR = slot.direction === 'down'
        ? slot.start.row + slot.length / 2
        : slot.start.row;
      const centerC = slot.direction === 'across'
        ? slot.start.col + slot.length / 2
        : slot.start.col;
      const distFromCenter = Math.abs(centerR - 2) + Math.abs(centerC - 2);
      score += (4 - distFromCenter) * 2;

      return { slot, score };
    });

    scoredSlots.sort((a, b) => b.score - a.score);

    // Try each slot position until we find one that works
    let placed = false;
    for (const { slot, score } of scoredSlots) {
      // Check if keyword still fits the slot (letters might have been placed)
      if (!keywordFitsSlot(keyword, {
        ...slot,
        pattern: getSlotPattern(currentGrid, slot),
      })) {
        continue;
      }

      // Try placing keyword in this slot
      const testGrid = placeKeywordInSlot(currentGrid, keyword, slot);

      if (!testGrid) continue;

      // Check if intersecting slots still have valid candidates
      // Pass placedCount for progressive verification thresholds
      if (verifyIntersectingSlots(testGrid, slot, wordIndex, assignments.length)) {
        currentGrid = testGrid;
        usedSlots.add(slotKey(slot));
        assignments.push({ slot, keyword, score });

        // Update direction counts for balance
        if (slot.direction === 'across') acrossCount++;
        else downCount++;

        placed = true;
        break;
      }
    }

    // If keyword couldn't be placed, that's ok - we continue with others
  }

  // Build set of theme cells (cells occupied by keywords)
  const themeCells = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.keyword && assignment.slot) {
      for (let i = 0; i < assignment.keyword.length; i++) {
        const r = assignment.slot.direction === 'down'
          ? assignment.slot.start.row + i
          : assignment.slot.start.row;
        const c = assignment.slot.direction === 'across'
          ? assignment.slot.start.col + i
          : assignment.slot.start.col;
        themeCells.add(`${r}-${c}`);
      }
    }
  }

  // Verify remaining slots are fillable (with auto-blacks to help)
  const { isFillable, improvedGrid } = verifyAllSlotsFillable(
    currentGrid,
    wordIndex,
    0.8,
    themeCells
  );

  // Use the improved grid (with strategic blacks added) for estimation
  currentGrid = improvedGrid;

  // Estimate Islamic % from remaining slot candidates
  const islamicPercent = estimateIslamicPercent(currentGrid, assignments, wordIndex);

  // Calculate total score: (themeCount × 2) + islamicPercent
  const themeKeywordsPlaced = assignments.filter(a => a.keyword).length;
  const totalScore = themeKeywordsPlaced * 2 + islamicPercent;

  return {
    patternIndex,
    patternName: BLACK_SQUARE_PATTERNS[patternIndex]?.name || `pattern-${patternIndex}`,
    assignments,
    themeKeywordsPlaced,
    estimatedIslamicPercent: islamicPercent,
    isFillable,
    totalScore,
  };
}

/**
 * Get the current pattern for a slot from a grid
 */
function getSlotPattern(grid: EditableCell[][], slot: SlotInfo): string {
  let pattern = '';
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === 'down' ? slot.start.row + i : slot.start.row;
    const c = slot.direction === 'across' ? slot.start.col + i : slot.start.col;
    pattern += grid[r][c].letter || '_';
  }
  return pattern;
}

/**
 * Find the best pattern + keyword assignment combination.
 * Tries all patterns, returns the one with most theme words that's still fillable.
 */
export function findBestKeywordAssignment(
  themeKeywords: string[],
  wordIndex?: WordIndex
): PatternCandidate | null {
  const index = wordIndex ?? getDefaultWordIndex();

  // Filter keywords to valid lengths
  const validKeywords = themeKeywords
    .filter(k => k.length >= 2 && k.length <= GRID_SIZE);

  if (validKeywords.length === 0) {
    return null;
  }

  const candidates: PatternCandidate[] = [];

  // Try each pattern
  for (let patternIndex = 0; patternIndex < BLACK_SQUARE_PATTERNS.length; patternIndex++) {
    const candidate = assignKeywordsToPattern(patternIndex, validKeywords, index);

    if (candidate && candidate.isFillable) {
      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) {
    // No fillable candidates - return best unfillable one for debugging
    for (let patternIndex = 0; patternIndex < BLACK_SQUARE_PATTERNS.length; patternIndex++) {
      const candidate = assignKeywordsToPattern(patternIndex, validKeywords, index);
      if (candidate && candidate.themeKeywordsPlaced > 0) {
        return candidate;
      }
    }
    return null;
  }

  // Sort by total score (highest first)
  candidates.sort((a, b) => b.totalScore - a.totalScore);

  return candidates[0];
}

/**
 * Execute a pre-validated pattern candidate by building the grid
 * and returning it ready for CSP fill.
 */
export function executePatternCandidate(
  candidate: PatternCandidate
): {
  grid: EditableCell[][];
  placedKeywords: { word: string; row: number; col: number; direction: 'across' | 'down' }[];
  themeCells: Set<string>;
} {
  // Create grid with pattern
  let grid = createEmptyGrid();
  grid = applyBlackPattern(grid, candidate.patternIndex);

  const placedKeywords: { word: string; row: number; col: number; direction: 'across' | 'down' }[] = [];
  const themeCells = new Set<string>();

  // Place all assigned keywords
  for (const assignment of candidate.assignments) {
    if (!assignment.keyword) continue;

    const result = placeKeywordInSlot(grid, assignment.keyword, assignment.slot);
    if (result) {
      grid = result;

      placedKeywords.push({
        word: assignment.keyword,
        row: assignment.slot.start.row,
        col: assignment.slot.start.col,
        direction: assignment.slot.direction,
      });

      // Track theme cells
      for (let i = 0; i < assignment.keyword.length; i++) {
        const r = assignment.slot.direction === 'down'
          ? assignment.slot.start.row + i
          : assignment.slot.start.row;
        const c = assignment.slot.direction === 'across'
          ? assignment.slot.start.col + i
          : assignment.slot.start.col;
        themeCells.add(`${r}-${c}`);
      }
    }
  }

  return { grid, placedKeywords, themeCells };
}
