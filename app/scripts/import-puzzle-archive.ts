/**
 * Import keywords from the puzzle archive (34 existing IPUZ puzzles)
 *
 * Run with: npx tsx scripts/import-puzzle-archive.ts
 *
 * This script:
 * 1. Reads all .ipuz files from /puzzles/01-34/
 * 2. Extracts words and clues from the grid
 * 3. Infers the prophet from the puzzle title
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

// IPUZ file structure
interface IpuzFile {
  title: string;
  puzzle: (string | number)[][];
  solution: (string | null)[][];
  clues: {
    Across: [number, string][];
    Down: [number, string][];
  };
  dimensions: {
    width: number;
    height: number;
  };
}

// Mapping of title patterns to prophet IDs
const PROPHET_PATTERNS: [RegExp, string][] = [
  [/adam/i, "ADAM"],
  [/nuh|noah/i, "NUH"],
  [/ibrahim|abraham/i, "IBRAHIM"],
  [/ismail|ishmael/i, "ISMAIL"],
  [/ishaq|isaac/i, "ISHAQ"],
  [/yaqub|jacob/i, "YAQUB"],
  [/yusuf|joseph/i, "YUSUF"],
  [/ayyub|job/i, "AYYUB"],
  [/musa|moses/i, "MUSA"],
  [/harun|aaron/i, "HARUN"],
  [/dawud|david/i, "DAWUD"],
  [/sulaiman|solomon/i, "SULAIMAN"],
  [/yunus|jonah/i, "YUNUS"],
  [/idris|enoch/i, "IDRIS"],
  [/hud/i, "HUD"],
  [/salih|saleh/i, "SALIH"],
  [/shuaib/i, "SHUAIB"],
  [/lut|lot/i, "LUT"],
  [/yahya|john/i, "YAHYA"],
  [/zakariya|zechariah/i, "ZAKARIYA"],
  [/isa|jesus/i, "ISA"],
  [/muhammad/i, "MUHAMMAD"],
];

function inferProphetFromTitle(title: string): string {
  for (const [pattern, prophetId] of PROPHET_PATTERNS) {
    if (pattern.test(title)) {
      return prophetId;
    }
  }
  // Default to GENERAL for "Prophet Stories" or unidentified
  return "GENERAL";
}

interface ExtractedWord {
  word: string;
  clue: string;
  direction: "across" | "down";
  number: number;
}

function extractWordsFromPuzzle(ipuz: IpuzFile): ExtractedWord[] {
  const words: ExtractedWord[] = [];
  const { width, height } = ipuz.dimensions;
  const solution = ipuz.solution;
  const puzzle = ipuz.puzzle;

  // Build a map of cell number to position
  const numberToPosition: Map<number, { row: number; col: number }> = new Map();
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cell = puzzle[row][col];
      if (typeof cell === "string" && /^\d+$/.test(cell)) {
        numberToPosition.set(parseInt(cell), { row, col });
      } else if (typeof cell === "number") {
        numberToPosition.set(cell, { row, col });
      }
    }
  }

  // Extract across words
  for (const [num, clue] of ipuz.clues.Across) {
    const pos = numberToPosition.get(num);
    if (!pos) continue;

    let word = "";
    let col = pos.col;
    while (col < width && solution[pos.row][col] !== null) {
      word += solution[pos.row][col];
      col++;
    }

    if (word.length >= 2 && word.length <= 5) {
      words.push({
        word: word.toUpperCase(),
        clue,
        direction: "across",
        number: num,
      });
    }
  }

  // Extract down words
  for (const [num, clue] of ipuz.clues.Down) {
    const pos = numberToPosition.get(num);
    if (!pos) continue;

    let word = "";
    let row = pos.row;
    while (row < height && solution[row][pos.col] !== null) {
      word += solution[row][pos.col];
      row++;
    }

    if (word.length >= 2 && word.length <= 5) {
      words.push({
        word: word.toUpperCase(),
        clue,
        direction: "down",
        number: num,
      });
    }
  }

  return words;
}

async function importPuzzleArchive() {
  console.log("Starting puzzle archive import...\n");

  const puzzlesDir = path.resolve(__dirname, "../../puzzles");

  if (!fs.existsSync(puzzlesDir)) {
    console.error(`Puzzles directory not found: ${puzzlesDir}`);
    process.exit(1);
  }

  // Collect all keywords
  const allKeywords: {
    word: string;
    prophetId: string;
    clue: string;
    sourceDetails: string;
    relevance: number;
  }[] = [];

  // Read all puzzle directories (01-34)
  const puzzleDirs = fs
    .readdirSync(puzzlesDir)
    .filter((d) => /^\d+$/.test(d))
    .sort((a, b) => parseInt(a) - parseInt(b));

  console.log(`Found ${puzzleDirs.length} puzzle directories\n`);

  for (const dir of puzzleDirs) {
    const dirPath = path.join(puzzlesDir, dir);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".ipuz"));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const puzzleNum = parseInt(dir);
      const puzzleName = file.replace(".ipuz", "");

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const ipuz: IpuzFile = JSON.parse(content);

        const prophetId = inferProphetFromTitle(ipuz.title);
        const words = extractWordsFromPuzzle(ipuz);

        console.log(
          `Puzzle ${puzzleNum}: ${ipuz.title} -> ${prophetId} (${words.length} words)`
        );

        for (const w of words) {
          allKeywords.push({
            word: w.word,
            prophetId,
            clue: w.clue,
            sourceDetails: `Puzzle ${puzzleNum} - ${puzzleName}`,
            relevance: 100, // Puzzle archive words are highly relevant
          });
        }
      } catch (error) {
        console.error(`Error parsing ${filePath}: ${error}`);
      }
    }
  }

  console.log(`\nTotal keywords extracted: ${allKeywords.length}`);

  // Deduplicate by word + prophetId (keep first occurrence)
  const seen = new Set<string>();
  const uniqueKeywords = allKeywords.filter((kw) => {
    const key = `${kw.word}:${kw.prophetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Unique keywords (after dedup): ${uniqueKeywords.length}`);

  // Import in batches
  const batchSize = 50;
  let totalImported = 0;
  let totalSkipped = 0;

  for (let i = 0; i < uniqueKeywords.length; i += batchSize) {
    const batch = uniqueKeywords.slice(i, i + batchSize);

    try {
      const result = await client.mutation(api.dataImport.importFromPuzzleArchive, {
        keywords: batch,
      });

      totalImported += result.imported;
      totalSkipped += result.skipped;

      process.stdout.write(
        `\rImporting: ${Math.min(i + batchSize, uniqueKeywords.length)}/${uniqueKeywords.length}`
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
  console.log("\nBy prophet:");
  const sortedProphets = Object.entries(stats.byProphet).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [prophet, count] of sortedProphets) {
    console.log(`  ${prophet}: ${count}`);
  }
}

importPuzzleArchive().catch(console.error);
