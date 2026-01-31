/**
 * Import keywords from the prophet stories word list
 *
 * Run with: npx tsx scripts/import-word-list.ts
 *
 * This script:
 * 1. Reads /words_lists/prophet stories (4).txt
 * 2. Parses WORD;SCORE;CLUE format
 * 3. Infers the prophet from clue content
 * 4. Imports into Convex prophetKeywords table
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

// Keywords to identify prophets from clues
const PROPHET_IDENTIFIERS: Record<string, string[]> = {
  ADAM: ["adam", "first man", "vicegerent", "hawwa", "habil", "qabil", "friday"],
  NUH: ["nuh", "noah", "ark", "judi", "flood"],
  IBRAHIM: [
    "ibrahim",
    "abraham",
    "fire", "coolness", "safety",
    "axe", "idols", "smash",
    "hagar", "sarah", "ismail", "ishaq",
    "namrud", "catapult", "pit",
  ],
  ISMAIL: ["ismail", "ishmael", "hagar", "zamzam", "sacrifice"],
  ISHAQ: ["ishaq", "isaac"],
  YAQUB: ["yaqub", "jacob", "twelve sons", "blind", "grief"],
  YUSUF: [
    "yusuf",
    "joseph",
    "well", "brothers",
    "dream", "interpret",
    "egypt", "aziz", "minister",
    "prison", "shirt", "binyamin",
    "beauty",
  ],
  AYYUB: ["ayyub", "job", "patience", "affliction", "fourteen children"],
  MUSA: [
    "musa",
    "moses",
    "pharaoh", "firaun",
    "staff", "serpent", "rod",
    "nile", "basket",
    "harun", "aaron",
    "sinai",
    "calf", "samiri",
    "torah", "tawrat",
    "khidr",
    "qarun",
    "plagues", "locusts", "blood",
    "red sea", "parted",
    "israelites", "exodus",
    "tablets",
  ],
  HARUN: ["harun", "aaron"],
  DAWUD: ["dawud", "david", "goliath", "jalut", "sling", "zabur", "psalms", "iron"],
  SULAIMAN: [
    "sulaiman",
    "solomon",
    "ant", "ants",
    "hoopoe",
    "jinn",
    "bilqis", "sheba", "glass",
    "birds",
  ],
  YUNUS: ["yunus", "jonah", "whale", "fish", "nineveh", "darkness"],
  IDRIS: ["idris", "enoch", "write"],
  HUD: ["hud", "'ad", "ad tribe", "people of ad"],
  SALIH: ["salih", "saleh", "thamud", "she-camel", "shecamel"],
  SHUAIB: ["shuaib", "madyan", "aykah", "wood"],
  LUT: ["lut", "lot", "sodom", "sodomy"],
  YAHYA: ["yahya", "john", "zakariya", "baptist"],
  ZAKARIYA: ["zakariya", "zechariah", "maryam", "yahya"],
  ISA: [
    "isa",
    "jesus",
    "maryam", "mary",
    "injil", "gospel",
    "apostle",
    "table", "feast", "supper",
    "cradle",
    "blind", "leper", "leprosy",
    "messiah",
  ],
  MUHAMMAD: [
    "muhammad",
    "prophet saw",
    "mecca", "medina", "yathrib",
    "hira",
    "hijra", "emigration",
    "badr", "uhud",
    "mi'raj", "isra",
    "quran", "qur'an",
    "ansar", "emigrants",
    "quraysh",
    "buraq",
    "farewell", "khutbah",
    "hadith", "sunnah",
    "ahl al-bayt",
  ],
};

function inferProphetFromClue(word: string, clue: string): string[] {
  const clueLower = clue.toLowerCase();
  const wordLower = word.toLowerCase();

  const matchedProphets: string[] = [];

  // Check if the word itself is a prophet name
  for (const [prophetId, identifiers] of Object.entries(PROPHET_IDENTIFIERS)) {
    if (identifiers.includes(wordLower)) {
      matchedProphets.push(prophetId);
    }
  }

  // Check clue content
  for (const [prophetId, identifiers] of Object.entries(PROPHET_IDENTIFIERS)) {
    for (const identifier of identifiers) {
      if (clueLower.includes(identifier) && !matchedProphets.includes(prophetId)) {
        matchedProphets.push(prophetId);
      }
    }
  }

  // Return GENERAL if no prophet identified
  return matchedProphets.length > 0 ? matchedProphets : ["GENERAL"];
}

interface ParsedKeyword {
  word: string;
  prophetId: string;
  clue: string;
  relevance: number;
}

function parseWordList(filePath: string): ParsedKeyword[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const keywords: ParsedKeyword[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(";");
    if (parts.length < 1) continue;

    const word = parts[0].trim().toUpperCase();
    if (!word || !/^[A-Z]+$/.test(word)) continue;

    // Only include 2-5 letter words for 5x5 grid
    if (word.length < 2 || word.length > 5) continue;

    // Parse clue
    let clue = "";
    if (parts.length >= 3 && parts[2].trim()) {
      clue = parts[2].trim();
      // Clean up clue
      clue = clue.replace(/^["'\s]+|["'\s]+$/g, "");
      clue = clue.replace(/""/g, '"');
      if (clue.endsWith('"') && (clue.match(/"/g) || []).length % 2 === 1) {
        clue = clue.slice(0, -1);
      }
    }

    if (!clue) continue;

    // Infer prophet(s) from the clue
    const prophets = inferProphetFromClue(word, clue);

    // Create a keyword entry for each prophet
    for (const prophetId of prophets) {
      keywords.push({
        word,
        prophetId,
        clue,
        relevance: prophetId === "GENERAL" ? 80 : 90, // Slightly lower than puzzle archive
      });
    }
  }

  return keywords;
}

async function importWordList() {
  console.log("Starting word list import...\n");

  const filePath = path.resolve(
    __dirname,
    "../../words_lists/prophet stories (4).txt"
  );

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Reading: ${filePath}\n`);
  const keywords = parseWordList(filePath);

  console.log(`Total keywords extracted: ${keywords.length}`);

  // Show prophet distribution
  const prophetCounts: Record<string, number> = {};
  for (const kw of keywords) {
    prophetCounts[kw.prophetId] = (prophetCounts[kw.prophetId] || 0) + 1;
  }
  console.log("\nProphet distribution:");
  for (const [prophet, count] of Object.entries(prophetCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${prophet}: ${count}`);
  }

  // Import in batches
  const batchSize = 50;
  let totalImported = 0;
  let totalSkipped = 0;

  console.log("\nImporting...");

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);

    try {
      const result = await client.mutation(api.dataImport.importFromWordList, {
        keywords: batch,
      });

      totalImported += result.imported;
      totalSkipped += result.skipped;

      process.stdout.write(
        `\rProgress: ${Math.min(i + batchSize, keywords.length)}/${keywords.length}`
      );
    } catch (error) {
      console.error(`\nError importing batch: ${error}`);
    }
  }

  console.log("\n\n=== Import Complete ===");
  console.log(`Imported: ${totalImported}`);
  console.log(`Skipped (duplicates): ${totalSkipped}`);

  // Show stats
  const stats = await client.query(api.prophetKeywords.stats, {});
  console.log("\n=== Database Stats ===");
  console.log(`Total keywords: ${stats.total}`);
  console.log("\nBy source:");
  for (const [source, count] of Object.entries(stats.bySource)) {
    console.log(`  ${source}: ${count}`);
  }
}

importWordList().catch(console.error);
