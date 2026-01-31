import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Prophet Keywords - Query and management functions
 *
 * Keywords are aggregated from three sources:
 * - puzzle-archive: Proven clues from 34 existing puzzles
 * - word-list: Curated entries from prophet stories word list
 * - scraped: AI-extracted from myislam.org (needs review)
 */

// Get all keywords for a specific prophet (approved only by default)
export const listByProphet = query({
  args: {
    prophetId: v.string(),
    includeUnapproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Query by prophet index
    const keywords = await ctx.db
      .query("prophetKeywords")
      .withIndex("by_prophet", (q) => q.eq("prophetId", args.prophetId.toUpperCase()))
      .collect();

    // Filter by approval status if needed
    const filtered = args.includeUnapproved
      ? keywords
      : keywords.filter((k) => k.isApproved);

    // Sort by relevance (highest first), then by source priority
    const sourcePriority: Record<string, number> = {
      "puzzle-archive": 3,
      "word-list": 2,
      "scraped": 1,
    };

    return filtered.sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return (sourcePriority[b.source] || 0) - (sourcePriority[a.source] || 0);
    });
  },
});

// Get all unique prophet IDs in the database
export const listProphets = query({
  args: {},
  handler: async (ctx) => {
    const keywords = await ctx.db.query("prophetKeywords").collect();
    const prophetIds = [...new Set(keywords.map((k) => k.prophetId))];
    return prophetIds.sort();
  },
});

// Get statistics by source
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const keywords = await ctx.db.query("prophetKeywords").collect();

    const bySource: Record<string, number> = {};
    const byProphet: Record<string, number> = {};
    let approvedCount = 0;
    let unapprovedCount = 0;

    for (const keyword of keywords) {
      bySource[keyword.source] = (bySource[keyword.source] || 0) + 1;
      byProphet[keyword.prophetId] = (byProphet[keyword.prophetId] || 0) + 1;
      if (keyword.isApproved) {
        approvedCount++;
      } else {
        unapprovedCount++;
      }
    }

    return {
      total: keywords.length,
      bySource,
      byProphet,
      approvedCount,
      unapprovedCount,
    };
  },
});

// Get count of unreviewed keywords
export const getUnreviewedCount = query({
  args: {},
  handler: async (ctx) => {
    const unreviewed = await ctx.db
      .query("prophetKeywords")
      .withIndex("by_approved", (q) => q.eq("isApproved", false))
      .collect();
    return unreviewed.length;
  },
});

// Search keywords by word or clue text
export const search = query({
  args: {
    query: v.string(),
    includeUnapproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const queryUpper = args.query.toUpperCase();
    const queryLower = args.query.toLowerCase();

    let keywords = await ctx.db.query("prophetKeywords").collect();

    // Filter by approval status if needed
    if (!args.includeUnapproved) {
      keywords = keywords.filter((k) => k.isApproved);
    }

    // Filter by word or clue match
    return keywords.filter(
      (k) =>
        k.word.includes(queryUpper) || k.clue.toLowerCase().includes(queryLower)
    );
  },
});

// Approve a scraped keyword after review
export const approve = mutation({
  args: {
    keywordId: v.id("prophetKeywords"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keywordId, { isApproved: true });
  },
});

// Bulk approve keywords
export const bulkApprove = mutation({
  args: {
    keywordIds: v.array(v.id("prophetKeywords")),
  },
  handler: async (ctx, args) => {
    for (const id of args.keywordIds) {
      await ctx.db.patch(id, { isApproved: true });
    }
  },
});

// Approve all unapproved keywords
export const approveAll = mutation({
  args: {},
  handler: async (ctx) => {
    const unapproved = await ctx.db
      .query("prophetKeywords")
      .withIndex("by_approved", (q) => q.eq("isApproved", false))
      .collect();

    for (const kw of unapproved) {
      await ctx.db.patch(kw._id, { isApproved: true });
    }

    return { approved: unapproved.length };
  },
});

// Delete a keyword
export const remove = mutation({
  args: {
    keywordId: v.id("prophetKeywords"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.keywordId);
  },
});

// Update a keyword's clue or relevance
export const update = mutation({
  args: {
    keywordId: v.id("prophetKeywords"),
    clue: v.optional(v.string()),
    relevance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Partial<{ clue: string; relevance: number }> = {};
    if (args.clue !== undefined) updates.clue = args.clue;
    if (args.relevance !== undefined) updates.relevance = args.relevance;
    await ctx.db.patch(args.keywordId, updates);
  },
});
