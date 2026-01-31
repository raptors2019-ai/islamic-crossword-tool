import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Word CRUD operations for Islamic Crossword Puzzle Tool
 */

// Get all words with optional filtering
export const list = query({
  args: {
    category: v.optional(v.string()),
    theme: v.optional(v.string()),
    maxLength: v.optional(v.number()),
    minScore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let words;

    // Apply category filter if provided
    if (args.category) {
      words = await ctx.db
        .query("words")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      words = await ctx.db.query("words").collect();
    }

    // Apply additional filters
    if (args.theme) {
      words = words.filter((w) => w.theme === args.theme);
    }

    if (args.maxLength) {
      words = words.filter((w) => w.word.length <= args.maxLength!);
    }

    if (args.minScore !== undefined) {
      const minScore = args.minScore;
      words = words.filter((w) => w.score >= minScore);
    }

    // Sort by score descending
    words.sort((a, b) => b.score - a.score);

    // Apply limit
    if (args.limit) {
      words = words.slice(0, args.limit);
    }

    return words;
  },
});

// Get words suitable for 5x5 grid (max 5 letters)
export const listFor5x5 = query({
  args: {
    category: v.optional(v.string()),
    theme: v.optional(v.string()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let words = await ctx.db.query("words").collect();

    // Filter to max 5 letters
    words = words.filter((w) => w.length <= 5);

    if (args.category) {
      words = words.filter((w) => w.category === args.category);
    }

    if (args.theme) {
      words = words.filter((w) => w.theme === args.theme);
    }

    if (args.minScore !== undefined) {
      const minScore = args.minScore;
      words = words.filter((w) => w.score >= minScore);
    }

    // Sort by score descending
    words.sort((a, b) => b.score - a.score);

    return words;
  },
});

// Get a single word by ID
export const get = query({
  args: { id: v.id("words") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get a word by its text
export const getByWord = query({
  args: { word: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("words")
      .withIndex("by_word", (q) => q.eq("word", args.word.toUpperCase()))
      .first();
  },
});

// Search words
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("words")
      .withSearchIndex("search_word", (q) => q.search("word", args.searchTerm))
      .take(50);
  },
});

// Create a new word
export const create = mutation({
  args: {
    word: v.string(),
    score: v.number(),
    category: v.string(),
    theme: v.optional(v.string()),
    spellingVariants: v.optional(v.array(v.string())),
    arabicScript: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const wordUpper = args.word.toUpperCase();

    // Check if word already exists
    const existing = await ctx.db
      .query("words")
      .withIndex("by_word", (q) => q.eq("word", wordUpper))
      .first();

    if (existing) {
      throw new Error(`Word "${wordUpper}" already exists`);
    }

    return await ctx.db.insert("words", {
      word: wordUpper,
      length: wordUpper.length,
      score: args.score,
      category: args.category,
      theme: args.theme,
      spellingVariants: args.spellingVariants || [wordUpper],
      arabicScript: args.arabicScript,
      source: args.source || "manual",
    });
  },
});

// Update a word
export const update = mutation({
  args: {
    id: v.id("words"),
    score: v.optional(v.number()),
    category: v.optional(v.string()),
    theme: v.optional(v.string()),
    spellingVariants: v.optional(v.array(v.string())),
    arabicScript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, cleanUpdates);
    return await ctx.db.get(id);
  },
});

// Delete a word (and its clues)
export const remove = mutation({
  args: { id: v.id("words") },
  handler: async (ctx, args) => {
    // Delete associated clues
    const clues = await ctx.db
      .query("clues")
      .withIndex("by_word", (q) => q.eq("wordId", args.id))
      .collect();

    for (const clue of clues) {
      await ctx.db.delete(clue._id);
    }

    await ctx.db.delete(args.id);
  },
});

// Bulk import words (for initial data load)
export const bulkImport = mutation({
  args: {
    words: v.array(
      v.object({
        word: v.string(),
        score: v.number(),
        category: v.string(),
        theme: v.optional(v.string()),
        spellingVariants: v.optional(v.array(v.string())),
        arabicScript: v.optional(v.string()),
        clue: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const wordData of args.words) {
      const wordUpper = wordData.word.toUpperCase();

      // Check if word already exists
      const existing = await ctx.db
        .query("words")
        .withIndex("by_word", (q) => q.eq("word", wordUpper))
        .first();

      if (existing) {
        results.skipped++;
        continue;
      }

      try {
        // Insert word
        const wordId = await ctx.db.insert("words", {
          word: wordUpper,
          length: wordUpper.length,
          score: wordData.score,
          category: wordData.category,
          theme: wordData.theme,
          spellingVariants: wordData.spellingVariants || [wordUpper],
          arabicScript: wordData.arabicScript,
          source: "imported",
        });

        // Insert clue if provided
        if (wordData.clue) {
          await ctx.db.insert("clues", {
            wordId,
            word: wordUpper,
            clue: wordData.clue,
            clueType: "simple",
            source: "imported",
            isApproved: true,
            usageCount: 0,
          });
        }

        results.imported++;
      } catch (e) {
        results.errors.push(`Error importing ${wordUpper}: ${e}`);
      }
    }

    return results;
  },
});

// Get word statistics
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const words = await ctx.db.query("words").collect();

    const byCategory: Record<string, number> = {};
    const byLength: Record<number, number> = {};

    for (const word of words) {
      byCategory[word.category] = (byCategory[word.category] || 0) + 1;
      const len = word.word.length;
      byLength[len] = (byLength[len] || 0) + 1;
    }

    return {
      total: words.length,
      byCategory,
      byLength,
      maxFiveLetters: words.filter((w) => w.word.length <= 5).length,
    };
  },
});
