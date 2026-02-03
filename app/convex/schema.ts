import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Islamic Crossword Puzzle Database Schema
 *
 * Designed for:
 * - 5x5 grid puzzles (max 5 letter words)
 * - Prophet Stories theme (first 50-60 puzzles)
 * - At least 50% Islamic/Arabic words
 * - Support for spelling variants (QURAN/KORAN, MUSA/MOSES)
 * - Multiple clue options per word with AI generation
 */

export default defineSchema({
  // Words table - core vocabulary
  words: defineTable({
    word: v.string(), // e.g., "QURAN" - always uppercase
    length: v.number(), // word length for 5x5 grid filtering
    score: v.number(), // word quality score (0-100)
    category: v.string(), // "prophets", "general", "names-of-allah", "quran", "companions"
    theme: v.optional(v.string()), // specific theme: "Prophet Muhammad", "Prophet Adam"
    spellingVariants: v.array(v.string()), // ["QURAN", "KORAN"] - all valid spellings
    arabicScript: v.optional(v.string()), // Arabic text representation
    source: v.string(), // "imported", "manual"
  })
    .index("by_word", ["word"])
    .index("by_category", ["category"])
    .index("by_theme", ["theme"])
    .index("by_length", ["length"]) // For filtering by word length (5x5 = max 5)
    .index("by_score", ["score"])
    .searchIndex("search_word", {
      searchField: "word",
    }),

  // Clues table - multiple clues per word
  clues: defineTable({
    wordId: v.id("words"),
    word: v.string(), // denormalized for easier queries
    clue: v.string(),
    clueType: v.string(), // "analogy", "dictionary", "simple", "phrase", "idiom", "sneaky"
    source: v.string(), // "imported", "ai-generated", "manual"
    isApproved: v.boolean(), // AI clues start as false until reviewed
    usageCount: v.number(), // how many puzzles used this clue
    lastUsedAt: v.optional(v.number()), // timestamp of last use
  })
    .index("by_word", ["wordId"])
    .index("by_word_string", ["word"])
    .index("by_approved", ["isApproved"])
    .index("by_type", ["clueType"])
    .searchIndex("search_clue", {
      searchField: "clue",
    }),

  // Puzzles table - completed puzzles
  puzzles: defineTable({
    title: v.string(), // e.g., "Prophet Adam 01"
    theme: v.string(), // e.g., "Prophet Stories"
    subTheme: v.optional(v.string()), // e.g., "Prophet Adam"
    author: v.string(),
    copyright: v.optional(v.string()),

    // Grid data (5x5)
    dimensions: v.object({
      width: v.number(),
      height: v.number(),
    }),

    // IPUZ-compatible grid structure
    // puzzle: "1", "2", "0" for numbered cells, "#" for black
    // solution: letter or null for black cells
    puzzleGrid: v.array(v.array(v.string())), // [["1","2","3","4","#"], ...]
    solutionGrid: v.array(v.array(v.union(v.string(), v.null()))), // [["A","D","A","M",null], ...]

    // Clues as IPUZ format: [[number, "clue text"], ...]
    cluesAcross: v.array(v.array(v.union(v.number(), v.string()))),
    cluesDown: v.array(v.array(v.union(v.number(), v.string()))),

    // Word/Clue tracking
    wordsUsed: v.array(v.id("words")),
    cluesUsed: v.array(v.id("clues")),

    // Export formats
    ipuz: v.optional(v.string()), // cached IPUZ JSON
    flutterJson: v.optional(v.string()), // cached Flutter app JSON

    // Metadata
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
    difficulty: v.optional(v.string()), // "easy", "medium", "hard"
    puzzleNumber: v.optional(v.number()), // sequence number in series
  })
    .index("by_theme", ["theme"])
    .index("by_created", ["createdAt"])
    .index("by_published", ["publishedAt"])
    .searchIndex("search_title", {
      searchField: "title",
    }),

  // Clue usage tracking - prevent duplicate clues across puzzles
  clueUsage: defineTable({
    clueId: v.id("clues"),
    puzzleId: v.id("puzzles"),
    usedAt: v.number(),
  })
    .index("by_clue", ["clueId"])
    .index("by_puzzle", ["puzzleId"]),

  // Prophet keywords - aggregated from multiple sources
  prophetKeywords: defineTable({
    word: v.string(), // e.g., "STAFF" - always uppercase
    prophetId: v.string(), // e.g., "MUSA" - prophet identifier
    clue: v.string(), // the clue text
    source: v.string(), // "puzzle-archive" | "word-list" | "scraped"
    sourceDetails: v.optional(v.string()), // e.g., "Puzzle 19 - Prophet Yusuf 01"
    relevance: v.number(), // 100 = direct, 80 = related, 60 = tangential
    isApproved: v.boolean(), // scraped items need review
  })
    .index("by_prophet", ["prophetId"])
    .index("by_word", ["word"])
    .index("by_source", ["source"])
    .index("by_approved", ["isApproved"])
    .index("by_prophet_approved", ["prophetId", "isApproved"]),

  // Pre-generated difficulty clues for prophet keywords
  // Stores easy/medium/hard clues (3 each per word) from AI generation
  difficultyClues: defineTable({
    word: v.string(), // Word (uppercase)
    prophetId: v.optional(v.string()), // Link to prophet (e.g., "MUSA", "YUSUF")
    difficulty: v.string(), // "easy" | "medium" | "hard"
    clue: v.string(), // The clue text
    clueIndex: v.number(), // 0, 1, or 2 (which alternative within difficulty)
    source: v.string(), // "ai-generated" | "manual"
    isApproved: v.boolean(), // Review status
    generatedAt: v.number(), // Timestamp when generated
  })
    .index("by_word", ["word"])
    .index("by_word_difficulty", ["word", "difficulty"])
    .index("by_prophet", ["prophetId"])
    .index("by_prophet_word", ["prophetId", "word"]),
});
