/**
 * Testing utilities for E2E tests
 *
 * Provides cleanup mutations and test helpers
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Clean up test-generated data (for future use when tests create persistent data)
 *
 * Currently, E2E tests don't persist puzzles to Convex, but this mutation
 * is available for future test scenarios that do.
 *
 * Identifies test puzzles by:
 * - Title containing "[E2E-TEST]" prefix
 * - Created within the specified timeframe
 */
export const cleanupE2EPuzzles = mutation({
  args: {
    olderThanMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoffMs = args.olderThanMs ?? 24 * 60 * 60 * 1000; // Default: 24 hours
    const cutoffTime = Date.now() - cutoffMs;

    // Find puzzles with E2E-TEST prefix in title
    const allPuzzles = await ctx.db.query('puzzles').collect();

    const testPuzzles = allPuzzles.filter(
      (p) => p.title.startsWith('[E2E-TEST]')
    );

    const toDelete = testPuzzles.filter(
      (p) => p._creationTime < cutoffTime
    );

    for (const puzzle of toDelete) {
      await ctx.db.delete(puzzle._id);
    }

    return {
      found: testPuzzles.length,
      deleted: toDelete.length,
    };
  },
});

/**
 * Get test environment status
 * Useful for E2E tests to verify Convex connection
 */
export const healthCheck = query({
  args: {},
  handler: async (ctx) => {
    // Simple query to verify connection
    const wordCount = await ctx.db.query('words').collect();

    return {
      status: 'ok',
      timestamp: Date.now(),
      wordCount: wordCount.length,
    };
  },
});
