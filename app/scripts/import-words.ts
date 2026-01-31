/**
 * Import word lists into Convex database
 *
 * Run with: npx tsx scripts/import-words.ts
 *
 * This script:
 * 1. Reads word lists from /Users/josh/Downloads/Word Lists/
 * 2. Parses WORD;SCORE;CLUE format
 * 3. Imports into Convex words and clues tables
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

interface ParsedWord {
  word: string;
  score: number;
  category: string;
  theme?: string;
  clue?: string;
}

function parseWordList(filePath: string, category: string, theme?: string): ParsedWord[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const words: ParsedWord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(";");
    if (parts.length < 1) continue;

    const word = parts[0].trim().toUpperCase();
    if (!word || !/^[A-Z]+$/.test(word)) continue;

    // Parse score (default to 50)
    let score = 50;
    if (parts.length >= 2 && parts[1].trim()) {
      const parsed = parseInt(parts[1].trim(), 10);
      if (!isNaN(parsed)) score = parsed;
    }

    // Parse clue
    let clue: string | undefined;
    if (parts.length >= 3 && parts[2].trim()) {
      clue = parts[2].trim();
      // Clean up clue
      clue = clue.replace(/^["'\s]+|["'\s]+$/g, "");
      clue = clue.replace(/""/g, '"');
      if (clue.endsWith('"') && (clue.match(/"/g) || []).length % 2 === 1) {
        clue = clue.slice(0, -1);
      }
    }

    words.push({ word, score, category, theme, clue });
  }

  return words;
}

async function importWords() {
  console.log("Starting word import...\n");

  const wordLists = [
    {
      path: "/Users/josh/Downloads/Word Lists/Islamic words (4).txt",
      category: "general",
    },
    {
      path: "/Users/josh/Downloads/Word Lists/prophet stories (4).txt",
      category: "prophets",
      theme: "Prophet Stories",
    },
  ];

  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (const list of wordLists) {
    if (!fs.existsSync(list.path)) {
      console.log(`File not found: ${list.path}`);
      continue;
    }

    console.log(`Processing: ${path.basename(list.path)}`);
    const words = parseWordList(list.path, list.category, list.theme);
    console.log(`  Found ${words.length} words`);

    // Import in batches of 50
    const batchSize = 50;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);

      try {
        const result = await client.mutation(api.words.bulkImport, {
          words: batch.map((w) => ({
            word: w.word,
            score: w.score,
            category: w.category,
            theme: w.theme,
            clue: w.clue,
          })),
        });

        totalImported += result.imported;
        totalSkipped += result.skipped;
        allErrors.push(...result.errors);

        process.stdout.write(`\r  Imported: ${i + batch.length}/${words.length}`);
      } catch (error) {
        console.error(`\n  Error importing batch: ${error}`);
      }
    }

    console.log(); // New line after progress
  }

  console.log("\n=== Import Complete ===");
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped (duplicates): ${totalSkipped}`);

  if (allErrors.length > 0) {
    console.log(`\nErrors (${allErrors.length}):`);
    allErrors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (allErrors.length > 10) {
      console.log(`  ... and ${allErrors.length - 10} more`);
    }
  }

  // Get stats
  const stats = await client.query(api.words.stats, {});
  console.log("\n=== Database Stats ===");
  console.log(`Total words: ${stats.total}`);
  console.log(`Max 5 letters (for 5x5): ${stats.maxFiveLetters}`);
  console.log("\nBy category:");
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`  ${category}: ${count}`);
  }
  console.log("\nBy length:");
  for (const [length, count] of Object.entries(stats.byLength).sort(
    (a, b) => parseInt(a[0]) - parseInt(b[0])
  )) {
    console.log(`  ${length} letters: ${count}`);
  }
}

importWords().catch(console.error);
