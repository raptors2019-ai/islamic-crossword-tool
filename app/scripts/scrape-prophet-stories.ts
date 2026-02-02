/**
 * Scrape prophet story content from myislam.org and extract keywords using AI
 *
 * Run with: npx tsx scripts/scrape-prophet-stories.ts
 *
 * This script:
 * 1. Uses Playwright to scrape each prophet's story page
 * 2. Extracts article content
 * 3. Calls Claude API to extract 10-15 keywords (2-5 letters) per prophet
 * 4. Imports into Convex prophetKeywords table (as unapproved)
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { chromium, Page } from "playwright";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!CONVEX_URL) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Prophet URLs on myislam.org
const PROPHET_PAGES: { prophetId: string; url: string; displayName: string }[] = [
  { prophetId: "ADAM", url: "https://myislam.org/prophet-stories/prophet-adam/", displayName: "Prophet Adam (AS)" },
  { prophetId: "IDRIS", url: "https://myislam.org/prophet-stories/prophet-idris/", displayName: "Prophet Idris (AS)" },
  { prophetId: "NUH", url: "https://myislam.org/prophet-stories/prophet-nuh/", displayName: "Prophet Nuh (AS)" },
  { prophetId: "HUD", url: "https://myislam.org/prophet-stories/prophet-hud/", displayName: "Prophet Hud (AS)" },
  { prophetId: "SALIH", url: "https://myislam.org/prophet-stories/prophet-salih/", displayName: "Prophet Salih (AS)" },
  { prophetId: "IBRAHIM", url: "https://myislam.org/prophet-stories/prophet-ibrahim/", displayName: "Prophet Ibrahim (AS)" },
  { prophetId: "LUT", url: "https://myislam.org/prophet-stories/prophet-lut/", displayName: "Prophet Lut (AS)" },
  { prophetId: "ISMAIL", url: "https://myislam.org/prophet-stories/prophet-ismail/", displayName: "Prophet Ismail (AS)" },
  { prophetId: "ISHAQ", url: "https://myislam.org/prophet-stories/prophet-ishaq/", displayName: "Prophet Ishaq (AS)" },
  { prophetId: "YAQUB", url: "https://myislam.org/prophet-stories/prophet-yaqub/", displayName: "Prophet Yaqub (AS)" },
  { prophetId: "YUSUF", url: "https://myislam.org/prophet-stories/prophet-yusuf/", displayName: "Prophet Yusuf (AS)" },
  { prophetId: "AYYUB", url: "https://myislam.org/prophet-stories/prophet-ayyub/", displayName: "Prophet Ayyub (AS)" },
  { prophetId: "SHUAIB", url: "https://myislam.org/prophet-stories/prophet-shuaib/", displayName: "Prophet Shuaib (AS)" },
  { prophetId: "MUSA", url: "https://myislam.org/prophet-stories/prophet-musa/", displayName: "Prophet Musa (AS)" },
  { prophetId: "HARUN", url: "https://myislam.org/prophet-stories/prophet-harun/", displayName: "Prophet Harun (AS)" },
  { prophetId: "DAWUD", url: "https://myislam.org/prophet-stories/prophet-dawud/", displayName: "Prophet Dawud (AS)" },
  { prophetId: "SULAIMAN", url: "https://myislam.org/prophet-stories/prophet-sulaiman/", displayName: "Prophet Sulaiman (AS)" },
  { prophetId: "YUNUS", url: "https://myislam.org/prophet-stories/prophet-yunus/", displayName: "Prophet Yunus (AS)" },
  { prophetId: "ZAKARIYA", url: "https://myislam.org/prophet-stories/prophet-zakariya/", displayName: "Prophet Zakariya (AS)" },
  { prophetId: "YAHYA", url: "https://myislam.org/prophet-stories/prophet-yahya/", displayName: "Prophet Yahya (AS)" },
  { prophetId: "ISA", url: "https://myislam.org/prophet-stories/prophet-isa/", displayName: "Prophet Isa (AS)" },
  { prophetId: "MUHAMMAD", url: "https://myislam.org/prophet-stories/prophet-muhammad/", displayName: "Prophet Muhammad (SAW)" },
];

interface ExtractedKeyword {
  word: string;
  clue: string;
  relevance: number;
}

async function extractKeywordsWithAI(
  content: string,
  prophetName: string
): Promise<ExtractedKeyword[]> {
  const prompt = `You are helping create crossword puzzles about Islamic prophet stories.

Given this article about ${prophetName}, extract 10-15 keywords that would work well in a crossword puzzle.

REQUIREMENTS:
1. Words MUST be 2-5 letters only (for a 5x5 crossword grid)
2. Words should be directly related to this prophet's story
3. Include names, places, objects, and concepts from the story
4. Each keyword needs a short, clear clue (suitable for crossword)
5. Assign relevance scores:
   - 100: Directly about this prophet
   - 90: Key story element
   - 80: Related concept
   - 70: Tangentially related

ARTICLE CONTENT:
${content.slice(0, 8000)}

Respond with a JSON array of objects with "word", "clue", and "relevance" fields.
Example:
[
  {"word": "STAFF", "clue": "Object that turned into a serpent", "relevance": 100},
  {"word": "NILE", "clue": "River where the basket floated", "relevance": 90}
]

Only output the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`No JSON found in response for ${prophetName}`);
      return [];
    }

    const keywords: ExtractedKeyword[] = JSON.parse(jsonMatch[0]);

    // Validate and filter
    return keywords.filter((k) => {
      const word = k.word?.toUpperCase();
      return (
        word &&
        /^[A-Z]+$/.test(word) &&
        word.length >= 2 &&
        word.length <= 5 &&
        k.clue &&
        typeof k.relevance === "number"
      );
    });
  } catch (error) {
    console.error(`Error extracting keywords for ${prophetName}: ${error}`);
    return [];
  }
}

async function scrapeProphetPage(
  page: Page,
  url: string
): Promise<string> {
  // Use domcontentloaded instead of networkidle for faster loading
  // Also increase timeout to 60 seconds
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Wait a bit for content to render
  await page.waitForTimeout(2000);

  // Try to get main article content
  const content = await page.evaluate(() => {
    // Try various selectors for article content
    const selectors = [
      "article",
      ".entry-content",
      ".post-content",
      ".article-content",
      "main",
      ".content",
      "#content",
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element.textContent || "";
      }
    }

    // Fallback to body
    return document.body.textContent || "";
  });

  return content.replace(/\s+/g, " ").trim();
}

async function scrapeProphetStories() {
  console.log("Starting prophet stories scraper...\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allKeywords: {
    word: string;
    prophetId: string;
    clue: string;
    relevance: number;
    sourceDetails: string;
  }[] = [];

  for (const prophet of PROPHET_PAGES) {
    console.log(`\nScraping: ${prophet.displayName}`);
    console.log(`  URL: ${prophet.url}`);

    try {
      const content = await scrapeProphetPage(page, prophet.url);
      console.log(`  Content length: ${content.length} chars`);

      if (content.length < 500) {
        console.log(`  Skipping - content too short`);
        continue;
      }

      console.log(`  Extracting keywords with AI...`);
      const keywords = await extractKeywordsWithAI(content, prophet.displayName);
      console.log(`  Extracted: ${keywords.length} keywords`);

      for (const kw of keywords) {
        allKeywords.push({
          word: kw.word.toUpperCase(),
          prophetId: prophet.prophetId,
          clue: kw.clue,
          relevance: kw.relevance,
          sourceDetails: prophet.url,
        });
      }

      // Rate limiting - wait between requests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }

  await browser.close();

  console.log(`\n=== Scraping Complete ===`);
  console.log(`Total keywords extracted: ${allKeywords.length}`);

  // Import to Convex
  if (allKeywords.length > 0) {
    console.log("\nImporting to Convex (as unapproved)...");

    const batchSize = 50;
    let totalImported = 0;
    let totalSkipped = 0;

    for (let i = 0; i < allKeywords.length; i += batchSize) {
      const batch = allKeywords.slice(i, i + batchSize);

      try {
        const result = await client.mutation(api.dataImport.importScrapedKeywords, {
          keywords: batch,
        });

        totalImported += result.imported;
        totalSkipped += result.skipped;

        process.stdout.write(
          `\rProgress: ${Math.min(i + batchSize, allKeywords.length)}/${allKeywords.length}`
        );
      } catch (error) {
        console.error(`\nError importing batch: ${error}`);
      }
    }

    console.log("\n\n=== Import Complete ===");
    console.log(`Imported: ${totalImported}`);
    console.log(`Skipped (duplicates): ${totalSkipped}`);
  }

  // Show stats
  const stats = await client.query(api.prophetKeywords.stats, {});
  console.log("\n=== Database Stats ===");
  console.log(`Total keywords: ${stats.total}`);
  console.log(`Approved: ${stats.approvedCount}`);
  console.log(`Needs review: ${stats.unapprovedCount}`);
  console.log("\nBy source:");
  for (const [source, count] of Object.entries(stats.bySource)) {
    console.log(`  ${source}: ${count}`);
  }
}

scrapeProphetStories().catch(console.error);
