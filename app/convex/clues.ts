import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Clue CRUD operations for Islamic Crossword Puzzle Tool
 *
 * Supports:
 * - Multiple clues per word (5-10 AI-generated options)
 * - Clue types: analogy, dictionary, simple, phrase, idiom, sneaky
 * - Usage tracking to prevent duplicate clues across puzzles
 */

// Get all clues for a word
export const listByWord = query({
  args: { wordId: v.id("words") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clues")
      .withIndex("by_word", (q) => q.eq("wordId", args.wordId))
      .collect();
  },
});

// Get all clues for a word by word string
export const listByWordString = query({
  args: { word: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clues")
      .withIndex("by_word_string", (q) => q.eq("word", args.word.toUpperCase()))
      .collect();
  },
});

// Get approved clues for a word (for puzzle building)
export const listApproved = query({
  args: { wordId: v.id("words") },
  handler: async (ctx, args) => {
    const clues = await ctx.db
      .query("clues")
      .withIndex("by_word", (q) => q.eq("wordId", args.wordId))
      .collect();

    return clues.filter((c) => c.isApproved);
  },
});

// Get unused clues for a word (not used in any puzzle)
export const listUnused = query({
  args: { wordId: v.id("words") },
  handler: async (ctx, args) => {
    const clues = await ctx.db
      .query("clues")
      .withIndex("by_word", (q) => q.eq("wordId", args.wordId))
      .collect();

    return clues.filter((c) => c.isApproved && c.usageCount === 0);
  },
});

// Get a single clue
export const get = query({
  args: { id: v.id("clues") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Search clues
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clues")
      .withSearchIndex("search_clue", (q) => q.search("clue", args.searchTerm))
      .take(50);
  },
});

// Check if a clue text has been used before
export const checkDuplicate = query({
  args: { clueText: v.string() },
  handler: async (ctx, args) => {
    const normalizedClue = args.clueText.toLowerCase().trim();

    // Search for similar clues
    const clues = await ctx.db
      .query("clues")
      .withSearchIndex("search_clue", (q) => q.search("clue", args.clueText))
      .take(20);

    // Check for exact or near matches
    for (const clue of clues) {
      const existingNormalized = clue.clue.toLowerCase().trim();
      if (existingNormalized === normalizedClue) {
        return {
          isDuplicate: true,
          existingClue: clue,
        };
      }
    }

    return { isDuplicate: false };
  },
});

// Create a new clue
export const create = mutation({
  args: {
    wordId: v.id("words"),
    clue: v.string(),
    clueType: v.string(),
    source: v.optional(v.string()),
    isApproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get the word to denormalize the word string
    const word = await ctx.db.get(args.wordId);
    if (!word) {
      throw new Error("Word not found");
    }

    return await ctx.db.insert("clues", {
      wordId: args.wordId,
      word: word.word,
      clue: args.clue,
      clueType: args.clueType,
      source: args.source || "manual",
      isApproved: args.isApproved ?? false,
      usageCount: 0,
    });
  },
});

// Bulk create clues (for AI-generated clues)
export const bulkCreate = mutation({
  args: {
    wordId: v.id("words"),
    clues: v.array(
      v.object({
        clue: v.string(),
        clueType: v.string(),
      })
    ),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const word = await ctx.db.get(args.wordId);
    if (!word) {
      throw new Error("Word not found");
    }

    const ids = [];
    for (const clueData of args.clues) {
      const id = await ctx.db.insert("clues", {
        wordId: args.wordId,
        word: word.word,
        clue: clueData.clue,
        clueType: clueData.clueType,
        source: args.source || "ai-generated",
        isApproved: false, // AI clues need review
        usageCount: 0,
      });
      ids.push(id);
    }

    return ids;
  },
});

// Update a clue
export const update = mutation({
  args: {
    id: v.id("clues"),
    clue: v.optional(v.string()),
    clueType: v.optional(v.string()),
    isApproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, cleanUpdates);
    return await ctx.db.get(id);
  },
});

// Approve a clue
export const approve = mutation({
  args: { id: v.id("clues") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isApproved: true });
    return await ctx.db.get(args.id);
  },
});

// Approve multiple clues
export const bulkApprove = mutation({
  args: { ids: v.array(v.id("clues")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.patch(id, { isApproved: true });
    }
    return args.ids.length;
  },
});

// Mark a clue as used in a puzzle
export const markUsed = mutation({
  args: {
    clueId: v.id("clues"),
    puzzleId: v.id("puzzles"),
  },
  handler: async (ctx, args) => {
    const clue = await ctx.db.get(args.clueId);
    if (!clue) {
      throw new Error("Clue not found");
    }

    // Update usage count
    await ctx.db.patch(args.clueId, {
      usageCount: clue.usageCount + 1,
      lastUsedAt: Date.now(),
    });

    // Record usage
    await ctx.db.insert("clueUsage", {
      clueId: args.clueId,
      puzzleId: args.puzzleId,
      usedAt: Date.now(),
    });
  },
});

// Delete a clue
export const remove = mutation({
  args: { id: v.id("clues") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Get clue statistics
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const clues = await ctx.db.query("clues").collect();

    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let approved = 0;
    let used = 0;

    for (const clue of clues) {
      byType[clue.clueType] = (byType[clue.clueType] || 0) + 1;
      bySource[clue.source] = (bySource[clue.source] || 0) + 1;
      if (clue.isApproved) approved++;
      if (clue.usageCount > 0) used++;
    }

    return {
      total: clues.length,
      approved,
      used,
      byType,
      bySource,
    };
  },
});
