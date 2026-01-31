/**
 * Generate AI keywords for each prophet using Claude
 *
 * Run with: npx tsx scripts/generate-ai-keywords.ts
 *
 * This script:
 * 1. Uses Claude to generate keywords based on Islamic prophet stories
 * 2. Does NOT require web scraping - uses Claude's training knowledge
 * 3. Imports into Convex prophetKeywords table (as unapproved)
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
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

// Prophet data for generating keywords
const PROPHETS = [
  {
    id: "ADAM",
    name: "Prophet Adam (AS)",
    context: "First man created from clay, Hawwa (Eve), Garden of Paradise, forbidden tree, Iblis/Satan, descent to Earth, Habil and Qabil (Abel and Cain), first murder, crow showing burial",
  },
  {
    id: "IDRIS",
    name: "Prophet Idris (AS)",
    context: "First to write with a pen, taught astronomy and mathematics, known for wisdom, raised to a high station, associated with Enoch",
  },
  {
    id: "NUH",
    name: "Prophet Nuh (AS)",
    context: "Noah, built the Ark, great flood, son who refused to board, animals in pairs, Mount Judi where ark landed, preached for 950 years",
  },
  {
    id: "HUD",
    name: "Prophet Hud (AS)",
    context: "Sent to people of 'Ad, they built tall towers, arrogant and powerful, destroyed by violent wind for eight days, worshipped idols",
  },
  {
    id: "SALIH",
    name: "Prophet Salih (AS)",
    context: "Sent to Thamud, she-camel miracle from mountain, people hamstrung the camel, carved homes in mountains, destroyed by earthquake/blast",
  },
  {
    id: "IBRAHIM",
    name: "Prophet Ibrahim (AS)",
    context: "Abraham, father of prophets, smashed idols with axe, thrown into fire that became cool, Namrud, Sarah and Hagar, built Kaaba with Ismail, sacrifice, three angels visiting, Lut his nephew",
  },
  {
    id: "LUT",
    name: "Prophet Lut (AS)",
    context: "Lot, nephew of Ibrahim, sent to Sodom, people practiced sodomy, angels visited, wife turned back, city destroyed, Dead Sea region",
  },
  {
    id: "ISMAIL",
    name: "Prophet Ismail (AS)",
    context: "Ishmael, son of Ibrahim and Hagar, left in desert, Zamzam water miracle, helped build Kaaba, nearly sacrificed, ancestor of Arabs",
  },
  {
    id: "ISHAQ",
    name: "Prophet Ishaq (AS)",
    context: "Isaac, son of Ibrahim and Sarah, born when parents elderly, angels brought glad tidings, father of Yaqub, ancestor of Israelites",
  },
  {
    id: "YAQUB",
    name: "Prophet Yaqub (AS)",
    context: "Jacob, son of Ishaq, had twelve sons, loved Yusuf most, became blind from grief, shirt healed his eyes, also called Israel",
  },
  {
    id: "YUSUF",
    name: "Prophet Yusuf (AS)",
    context: "Joseph, thrown in well by jealous brothers, sold as slave in Egypt, Aziz purchased him, wife's temptation, prison, dream interpretation, became minister, reunited with family, given half of beauty",
  },
  {
    id: "AYYUB",
    name: "Prophet Ayyub (AS)",
    context: "Job, tested with loss of wealth, children, health, patient for years, struck ground and water sprang, wife remained faithful, restored twofold",
  },
  {
    id: "SHUAIB",
    name: "Prophet Shuaib (AS)",
    context: "Sent to Madyan, people cheated in trade, dishonest weights and measures, father-in-law of Musa, Companions of the Wood (Aykah)",
  },
  {
    id: "MUSA",
    name: "Prophet Musa (AS)",
    context: "Moses, born during Pharaoh's massacre, basket in Nile, raised in palace, killed Egyptian, fled to Madyan, burning bush, staff became serpent, ten plagues, parted Red Sea, Tablets on Sinai, golden calf, Khidr, wandering 40 years",
  },
  {
    id: "HARUN",
    name: "Prophet Harun (AS)",
    context: "Aaron, elder brother of Musa, eloquent speaker, helped confront Pharaoh, left in charge during Sinai, golden calf incident, died before entering promised land",
  },
  {
    id: "DAWUD",
    name: "Prophet Dawud (AS)",
    context: "David, killed Goliath (Jalut) with sling, became king of Israel, given Zabur (Psalms), iron made soft for him, beautiful voice, armor making",
  },
  {
    id: "SULAIMAN",
    name: "Prophet Sulaiman (AS)",
    context: "Solomon, son of Dawud, commanded jinn and winds, understood language of birds and ants, Queen of Sheba (Bilqis), glass palace, hoopoe messenger, wisest and wealthiest",
  },
  {
    id: "YUNUS",
    name: "Prophet Yunus (AS)",
    context: "Jonah, sent to Nineveh, left before completing mission, thrown from ship, swallowed by whale, prayed in darkness, spit out on shore, people repented",
  },
  {
    id: "ZAKARIYA",
    name: "Prophet Zakariya (AS)",
    context: "Zechariah, guardian of Maryam, prayed for son in old age, given Yahya, found fruit out of season in Maryam's chamber, made mute as sign",
  },
  {
    id: "YAHYA",
    name: "Prophet Yahya (AS)",
    context: "John the Baptist, son of Zakariya, born to elderly parents, given wisdom as child, wept often in fear of Allah, opposed Herod's marriage, martyred",
  },
  {
    id: "ISA",
    name: "Prophet Isa (AS)",
    context: "Jesus, born to virgin Maryam, spoke from cradle, given Injil (Gospel), healed blind and lepers, raised dead, table spread from heaven, not crucified but raised, will return",
  },
  {
    id: "MUHAMMAD",
    name: "Prophet Muhammad (SAW)",
    context: "Final Prophet, born in Mecca, orphaned young, cave of Hira, first revelation, Hijra to Medina, battles of Badr and Uhud, Isra and Mi'raj, Quran revealed over 23 years, farewell sermon, died in Medina",
  },
];

interface ExtractedKeyword {
  word: string;
  clue: string;
  relevance: number;
}

async function generateKeywordsForProphet(
  prophetId: string,
  prophetName: string,
  context: string
): Promise<ExtractedKeyword[]> {
  const prompt = `You are helping create crossword puzzles about Islamic prophet stories.

Generate 12-15 keywords for ${prophetName} that would work in a crossword puzzle.

STORY CONTEXT:
${context}

REQUIREMENTS:
1. Words MUST be 2-5 letters ONLY (for a 5x5 crossword grid)
2. Words should be directly related to this prophet's story
3. Include: names, places, objects, concepts from the story
4. Each keyword needs a short, clear clue (crossword style)
5. Assign relevance scores:
   - 100: The prophet's name or key miracle
   - 95: Direct story element (person, place, object)
   - 90: Important concept from their story
   - 85: Related element
   - 80: Tangentially related

IMPORTANT:
- Focus on words 3-5 letters - those are most useful for crosswords
- Avoid common English words unless they have Islamic significance
- Include Arabic terms where appropriate (transliterated)
- Make clues specific to this prophet's story, not generic

Respond with a JSON array of objects with "word", "clue", and "relevance" fields.
Example format:
[
  {"word": "STAFF", "clue": "Object that transformed into a serpent for Musa", "relevance": 100},
  {"word": "NILE", "clue": "River where baby Musa was placed in a basket", "relevance": 95}
]

Only output the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`  No JSON found in response for ${prophetName}`);
      return [];
    }

    const keywords: ExtractedKeyword[] = JSON.parse(jsonMatch[0]);

    // Validate and filter - strict 2-5 letter requirement
    return keywords.filter((k) => {
      const word = k.word?.toUpperCase().replace(/[^A-Z]/g, "");
      return (
        word &&
        word.length >= 2 &&
        word.length <= 5 &&
        k.clue &&
        typeof k.relevance === "number"
      );
    }).map((k) => ({
      word: k.word.toUpperCase().replace(/[^A-Z]/g, ""),
      clue: k.clue,
      relevance: k.relevance,
    }));
  } catch (error) {
    console.error(`  Error generating keywords for ${prophetName}: ${error}`);
    return [];
  }
}

async function generateAllKeywords() {
  console.log("Starting AI keyword generation...\n");

  const allKeywords: {
    word: string;
    prophetId: string;
    clue: string;
    relevance: number;
    sourceDetails: string;
  }[] = [];

  for (const prophet of PROPHETS) {
    console.log(`Generating keywords for: ${prophet.name}`);

    const keywords = await generateKeywordsForProphet(
      prophet.id,
      prophet.name,
      prophet.context
    );

    console.log(`  Generated: ${keywords.length} keywords`);

    for (const kw of keywords) {
      allKeywords.push({
        word: kw.word,
        prophetId: prophet.id,
        clue: kw.clue,
        relevance: kw.relevance,
        sourceDetails: `AI-generated for ${prophet.name}`,
      });
    }

    // Small delay between API calls
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n=== Generation Complete ===`);
  console.log(`Total keywords generated: ${allKeywords.length}`);

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

generateAllKeywords().catch(console.error);
