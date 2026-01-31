import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Data Import Functions for Prophet Keywords
 *
 * Imports from three sources:
 * 1. puzzle-archive: Parsed from IPUZ files
 * 2. word-list: Parsed from semicolon-separated word list
 * 3. scraped: AI-extracted from myislam.org content
 */

// Bulk import from puzzle archive (called from Node script)
export const importFromPuzzleArchive = mutation({
  args: {
    keywords: v.array(
      v.object({
        word: v.string(),
        prophetId: v.string(),
        clue: v.string(),
        sourceDetails: v.string(),
        relevance: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;

    for (const kw of args.keywords) {
      // Check for duplicates (same word + prophet + source)
      const existing = await ctx.db
        .query("prophetKeywords")
        .withIndex("by_word", (q) => q.eq("word", kw.word.toUpperCase()))
        .filter((q) =>
          q.and(
            q.eq(q.field("prophetId"), kw.prophetId.toUpperCase()),
            q.eq(q.field("source"), "puzzle-archive")
          )
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("prophetKeywords", {
        word: kw.word.toUpperCase(),
        prophetId: kw.prophetId.toUpperCase(),
        clue: kw.clue.trim(),
        source: "puzzle-archive",
        sourceDetails: kw.sourceDetails,
        relevance: kw.relevance,
        isApproved: true, // Puzzle archive data is pre-approved
      });
      imported++;
    }

    return { imported, skipped };
  },
});

// Bulk import from word list (called from Node script)
export const importFromWordList = mutation({
  args: {
    keywords: v.array(
      v.object({
        word: v.string(),
        prophetId: v.string(),
        clue: v.string(),
        relevance: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;

    for (const kw of args.keywords) {
      // Check for duplicates
      const existing = await ctx.db
        .query("prophetKeywords")
        .withIndex("by_word", (q) => q.eq("word", kw.word.toUpperCase()))
        .filter((q) =>
          q.and(
            q.eq(q.field("prophetId"), kw.prophetId.toUpperCase()),
            q.eq(q.field("source"), "word-list")
          )
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("prophetKeywords", {
        word: kw.word.toUpperCase(),
        prophetId: kw.prophetId.toUpperCase(),
        clue: kw.clue.trim(),
        source: "word-list",
        relevance: kw.relevance,
        isApproved: true, // Word list data is pre-approved
      });
      imported++;
    }

    return { imported, skipped };
  },
});

// Import scraped keywords (action for external API calls)
export const importScrapedKeywords = mutation({
  args: {
    keywords: v.array(
      v.object({
        word: v.string(),
        prophetId: v.string(),
        clue: v.string(),
        relevance: v.number(),
        sourceDetails: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;

    for (const kw of args.keywords) {
      // Check for duplicates
      const existing = await ctx.db
        .query("prophetKeywords")
        .withIndex("by_word", (q) => q.eq("word", kw.word.toUpperCase()))
        .filter((q) =>
          q.eq(q.field("prophetId"), kw.prophetId.toUpperCase())
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("prophetKeywords", {
        word: kw.word.toUpperCase(),
        prophetId: kw.prophetId.toUpperCase(),
        clue: kw.clue.trim(),
        source: "scraped",
        sourceDetails: kw.sourceDetails,
        relevance: kw.relevance,
        isApproved: false, // Scraped data needs review
      });
      imported++;
    }

    return { imported, skipped };
  },
});

// Clear all keywords (for testing/reset)
export const clearAll = mutation({
  args: {
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let keywords;
    if (args.source) {
      keywords = await ctx.db
        .query("prophetKeywords")
        .withIndex("by_source", (q) => q.eq("source", args.source!))
        .collect();
    } else {
      keywords = await ctx.db.query("prophetKeywords").collect();
    }

    for (const kw of keywords) {
      await ctx.db.delete(kw._id);
    }

    return { deleted: keywords.length };
  },
});

// Get import status
export const getImportStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("prophetKeywords").collect();

    const sources = {
      "puzzle-archive": 0,
      "word-list": 0,
      scraped: 0,
    };

    for (const kw of all) {
      if (kw.source in sources) {
        sources[kw.source as keyof typeof sources]++;
      }
    }

    return sources;
  },
});
