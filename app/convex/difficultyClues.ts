import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * Pre-generated Difficulty Clues - Query and management functions
 *
 * Stores easy/medium/hard clues (3 each per word) that were pre-generated
 * using AI to minimize API costs and improve load times.
 */

// Get all pre-generated clues for a specific word
export const getForWord = query({
  args: {
    word: v.string(),
  },
  handler: async (ctx, args) => {
    const wordUpper = args.word.toUpperCase();
    const clues = await ctx.db
      .query("difficultyClues")
      .withIndex("by_word", (q) => q.eq("word", wordUpper))
      .collect();

    // Organize by difficulty
    const result: {
      easy: string[];
      medium: string[];
      hard: string[];
    } = { easy: [], medium: [], hard: [] };

    for (const clue of clues) {
      if (clue.difficulty === "easy") {
        result.easy[clue.clueIndex] = clue.clue;
      } else if (clue.difficulty === "medium") {
        result.medium[clue.clueIndex] = clue.clue;
      } else if (clue.difficulty === "hard") {
        result.hard[clue.clueIndex] = clue.clue;
      }
    }

    // Filter out undefined slots
    result.easy = result.easy.filter(Boolean);
    result.medium = result.medium.filter(Boolean);
    result.hard = result.hard.filter(Boolean);

    return result;
  },
});

// Get all pre-generated clues for multiple words at once
// This is useful for loading clues for filler words that have no prophetId
export const getForWords = query({
  args: {
    words: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const result: Record<
      string,
      {
        easy: string[];
        medium: string[];
        hard: string[];
      }
    > = {};

    // Query each word (Convex doesn't support IN queries, so we do parallel lookups)
    for (const word of args.words) {
      const wordUpper = word.toUpperCase();
      const clues = await ctx.db
        .query("difficultyClues")
        .withIndex("by_word", (q) => q.eq("word", wordUpper))
        .collect();

      if (clues.length > 0) {
        result[wordUpper] = { easy: [], medium: [], hard: [] };

        for (const clue of clues) {
          if (clue.difficulty === "easy") {
            result[wordUpper].easy[clue.clueIndex] = clue.clue;
          } else if (clue.difficulty === "medium") {
            result[wordUpper].medium[clue.clueIndex] = clue.clue;
          } else if (clue.difficulty === "hard") {
            result[wordUpper].hard[clue.clueIndex] = clue.clue;
          }
        }

        // Filter out undefined slots
        result[wordUpper].easy = result[wordUpper].easy.filter(Boolean);
        result[wordUpper].medium = result[wordUpper].medium.filter(Boolean);
        result[wordUpper].hard = result[wordUpper].hard.filter(Boolean);
      }
    }

    return result;
  },
});

// Get all pre-generated clues for a prophet's keywords
export const getForProphet = query({
  args: {
    prophetId: v.string(),
  },
  handler: async (ctx, args) => {
    const prophetIdUpper = args.prophetId.toUpperCase();
    const clues = await ctx.db
      .query("difficultyClues")
      .withIndex("by_prophet", (q) => q.eq("prophetId", prophetIdUpper))
      .collect();

    // Organize by word, then by difficulty
    const result: Record<
      string,
      {
        easy: string[];
        medium: string[];
        hard: string[];
      }
    > = {};

    for (const clue of clues) {
      if (!result[clue.word]) {
        result[clue.word] = { easy: [], medium: [], hard: [] };
      }

      if (clue.difficulty === "easy") {
        result[clue.word].easy[clue.clueIndex] = clue.clue;
      } else if (clue.difficulty === "medium") {
        result[clue.word].medium[clue.clueIndex] = clue.clue;
      } else if (clue.difficulty === "hard") {
        result[clue.word].hard[clue.clueIndex] = clue.clue;
      }
    }

    // Filter out undefined slots for each word
    for (const word of Object.keys(result)) {
      result[word].easy = result[word].easy.filter(Boolean);
      result[word].medium = result[word].medium.filter(Boolean);
      result[word].hard = result[word].hard.filter(Boolean);
    }

    return result;
  },
});

// Store pre-generated clues for a word
// Expects 9 clues: 3 easy, 3 medium, 3 hard
export const storeGenerated = mutation({
  args: {
    word: v.string(),
    prophetId: v.optional(v.string()),
    clues: v.object({
      easy: v.array(v.string()),
      medium: v.array(v.string()),
      hard: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const wordUpper = args.word.toUpperCase();
    const prophetIdUpper = args.prophetId?.toUpperCase();
    const now = Date.now();

    // Delete existing clues for this word to avoid duplicates
    const existing = await ctx.db
      .query("difficultyClues")
      .withIndex("by_word", (q) => q.eq("word", wordUpper))
      .collect();

    for (const clue of existing) {
      await ctx.db.delete(clue._id);
    }

    // Insert new clues
    const difficulties = ["easy", "medium", "hard"] as const;
    const insertedIds: string[] = [];

    for (const difficulty of difficulties) {
      const cluesForDifficulty = args.clues[difficulty];
      for (let i = 0; i < cluesForDifficulty.length; i++) {
        const clue = cluesForDifficulty[i];
        if (clue && clue.trim().length > 0) {
          const id = await ctx.db.insert("difficultyClues", {
            word: wordUpper,
            prophetId: prophetIdUpper,
            difficulty,
            clue: clue.trim(),
            clueIndex: i,
            source: "ai-generated",
            isApproved: false,
            generatedAt: now,
          });
          insertedIds.push(id);
        }
      }
    }

    return { inserted: insertedIds.length };
  },
});

// Internal mutation for batch imports (from scripts)
export const batchStoreGenerated = internalMutation({
  args: {
    entries: v.array(
      v.object({
        word: v.string(),
        prophetId: v.optional(v.string()),
        clues: v.object({
          easy: v.array(v.string()),
          medium: v.array(v.string()),
          hard: v.array(v.string()),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let totalInserted = 0;

    for (const entry of args.entries) {
      const wordUpper = entry.word.toUpperCase();
      const prophetIdUpper = entry.prophetId?.toUpperCase();

      // Delete existing clues for this word
      const existing = await ctx.db
        .query("difficultyClues")
        .withIndex("by_word", (q) => q.eq("word", wordUpper))
        .collect();

      for (const clue of existing) {
        await ctx.db.delete(clue._id);
      }

      // Insert new clues
      const difficulties = ["easy", "medium", "hard"] as const;

      for (const difficulty of difficulties) {
        const cluesForDifficulty = entry.clues[difficulty];
        for (let i = 0; i < cluesForDifficulty.length; i++) {
          const clue = cluesForDifficulty[i];
          if (clue && clue.trim().length > 0) {
            await ctx.db.insert("difficultyClues", {
              word: wordUpper,
              prophetId: prophetIdUpper,
              difficulty,
              clue: clue.trim(),
              clueIndex: i,
              source: "ai-generated",
              isApproved: false,
              generatedAt: now,
            });
            totalInserted++;
          }
        }
      }
    }

    return { inserted: totalInserted };
  },
});

// Get words for a prophet that don't have pre-generated clues yet
export const getMissingWords = query({
  args: {
    prophetId: v.string(),
  },
  handler: async (ctx, args) => {
    const prophetIdUpper = args.prophetId.toUpperCase();

    // Get all keywords for this prophet
    const keywords = await ctx.db
      .query("prophetKeywords")
      .withIndex("by_prophet", (q) => q.eq("prophetId", prophetIdUpper))
      .collect();

    // Get all words that already have pre-generated clues
    const existingClues = await ctx.db
      .query("difficultyClues")
      .withIndex("by_prophet", (q) => q.eq("prophetId", prophetIdUpper))
      .collect();

    const wordsWithClues = new Set(existingClues.map((c) => c.word));

    // Return keywords that don't have clues yet
    return keywords.filter((kw) => !wordsWithClues.has(kw.word.toUpperCase()));
  },
});

// Get statistics about pre-generated clues
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const clues = await ctx.db.query("difficultyClues").collect();

    const byProphet: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    const uniqueWords = new Set<string>();

    for (const clue of clues) {
      if (clue.prophetId) {
        byProphet[clue.prophetId] = (byProphet[clue.prophetId] || 0) + 1;
      }
      byDifficulty[clue.difficulty] = (byDifficulty[clue.difficulty] || 0) + 1;
      uniqueWords.add(clue.word);
    }

    return {
      totalClues: clues.length,
      uniqueWords: uniqueWords.size,
      byProphet,
      byDifficulty,
    };
  },
});

// Check if a word has pre-generated clues
export const hasCluesForWord = query({
  args: {
    word: v.string(),
  },
  handler: async (ctx, args) => {
    const wordUpper = args.word.toUpperCase();
    const clues = await ctx.db
      .query("difficultyClues")
      .withIndex("by_word", (q) => q.eq("word", wordUpper))
      .collect();

    return clues.length > 0;
  },
});

// Approve a clue after review
export const approve = mutation({
  args: {
    clueId: v.id("difficultyClues"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clueId, { isApproved: true });
  },
});

// Bulk approve all clues for a prophet
export const approveForProphet = mutation({
  args: {
    prophetId: v.string(),
  },
  handler: async (ctx, args) => {
    const prophetIdUpper = args.prophetId.toUpperCase();
    const clues = await ctx.db
      .query("difficultyClues")
      .withIndex("by_prophet", (q) => q.eq("prophetId", prophetIdUpper))
      .collect();

    let approvedCount = 0;
    for (const clue of clues) {
      if (!clue.isApproved) {
        await ctx.db.patch(clue._id, { isApproved: true });
        approvedCount++;
      }
    }

    return { approved: approvedCount };
  },
});
