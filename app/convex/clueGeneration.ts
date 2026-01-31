import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * AI-powered clue generation using Anthropic Claude API.
 *
 * Generates 7-10 clue options per word based on the cruciverbist prompt.
 */

// Clue generation prompt template - categorized by difficulty with 3 options each
const CLUE_PROMPT = `You are an expert cruciverbist (crossword puzzle creator) in the style of Patrick Barry and Will Shortz, specializing in Islamic-themed crossword puzzles.

Create clues for the word: {word}

IMPORTANT RULES:
- The clue should be the SAME PART OF SPEECH as the entry word
- Use "___" (three underscores) for blanks in fill-in-the-blank clues
- If possible, create clues connected to Islamic themes, stories, companions, prophets
- Can also use clever/general clues for English audience

{islamicContext}

Generate exactly 9 clues (3 per difficulty level):

**EASY** (3 clues) - Simple, straightforward definitions or direct Islamic references
**MEDIUM** (3 clues) - Familiar phrase clues ("costs for living" for RANSOM), idiom ("she's a doll" for BARBIE), or clever dictionary clues
**HARD** (3 clues) - Analogy clues, sneaky misdirection, double meaning, or wordplay

Return EXACTLY this JSON format (no markdown, no extra text):
{
  "word": "{word}",
  "easy": ["clue 1", "clue 2", "clue 3"],
  "medium": ["clue 1", "clue 2", "clue 3"],
  "hard": ["clue 1", "clue 2", "clue 3"]
}

Requirements:
- Each clue must be UNIQUE and different in approach
- All 3 clues within each difficulty should be distinct options
- Prefer Islamic connections when the word is Islamic
- Clues should be suitable for all ages
- Keep clues concise (under 80 characters each)
- Make sure all HARD clues are genuinely tricky/clever`;

// Prophet names with context
const PROPHET_CONTEXT: Record<string, string> = {
  ADAM: "First prophet and first man",
  NUH: "Prophet Noah, built the Ark",
  IBRAHIM: "Father of prophets, friend of Allah",
  MUSA: "Prophet Moses, received Torah",
  ISA: "Prophet Jesus, born of Maryam",
  MUHAMMAD: "Final Prophet, peace be upon him",
  YUSUF: "Prophet Joseph, interpreter of dreams",
  DAWUD: "Prophet David, given Zabur (Psalms)",
  SULAIMAN: "Prophet Solomon, ruled jinn and animals",
  AYYUB: "Prophet Job, model of patience",
  YUNUS: "Prophet Jonah, in the whale",
  IDRIS: "Prophet Enoch, first to write",
  HUD: "Sent to people of 'Ad",
  SALIH: "Sent to Thamud with she-camel",
  YAHYA: "John the Baptist",
};

function getIslamicContext(word: string, existingClue?: string): string {
  const wordUpper = word.toUpperCase();

  if (PROPHET_CONTEXT[wordUpper]) {
    return `\nIslamic Context: This word is a Prophet's name. ${PROPHET_CONTEXT[wordUpper]}`;
  }

  const allahNames = [
    "RAHMAN",
    "RAHIM",
    "MALIK",
    "QUDDUS",
    "SALAM",
    "AZIZ",
    "JABBAR",
    "KHALIQ",
    "ALIM",
    "HAKAM",
    "LATIF",
    "KHABIR",
    "GHAFUR",
    "WADUD",
  ];
  if (allahNames.includes(wordUpper)) {
    return "\nIslamic Context: This is one of the 99 Names of Allah (Asma ul-Husna).";
  }

  const quranTerms = [
    "QURAN",
    "SURAH",
    "AYAH",
    "JUZ",
    "FATIHA",
    "BAQARAH",
    "KAHF",
  ];
  if (quranTerms.includes(wordUpper)) {
    return "\nIslamic Context: This is a Quranic term.";
  }

  const pillars = [
    "SALAH",
    "SAWM",
    "ZAKAT",
    "HAJJ",
    "SHAHADA",
    "FAJR",
    "DHUHR",
    "ASR",
    "MAGHRIB",
    "ISHA",
    "WUDU",
    "GHUSL",
  ];
  if (pillars.includes(wordUpper)) {
    return "\nIslamic Context: This relates to the pillars of Islam or worship practices.";
  }

  if (existingClue) {
    return `\nExisting clue for reference: "${existingClue}"`;
  }

  return "\nIslamic Context: Try to find Islamic connections if possible.";
}

// Action to generate clues using Claude API
export const generateClues = action({
  args: {
    word: v.string(),
    existingClue: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    word: string;
    easy: string[];
    medium: string[];
    hard: string[];
    error?: string;
  }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        word: args.word,
        easy: [],
        medium: [],
        hard: [],
        error: "ANTHROPIC_API_KEY not configured",
      };
    }

    const word = args.word.toUpperCase();
    const islamicContext = getIslamicContext(word, args.existingClue);
    const prompt = CLUE_PROMPT.replace(/\{word\}/g, word).replace(
      "{islamicContext}",
      islamicContext
    );

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Parse JSON from response
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        // Try to extract JSON from markdown
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse response");
        }
      }

      // Normalize to arrays (handle both old string format and new array format)
      const normalizeToArray = (val: unknown): string[] => {
        if (Array.isArray(val)) return val.filter(v => typeof v === 'string' && v.length > 0);
        if (typeof val === 'string' && val.length > 0) return [val];
        return [];
      };

      return {
        word,
        easy: normalizeToArray(parsedData.easy),
        medium: normalizeToArray(parsedData.medium),
        hard: normalizeToArray(parsedData.hard),
      };
    } catch (error) {
      return {
        word,
        easy: [],
        medium: [],
        hard: [],
        error: String(error),
      };
    }
  },
});

// Action to generate and store clues for a word
export const generateAndStoreClues = action({
  args: {
    wordId: v.id("words"),
    word: v.string(),
    existingClue: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    word: string;
    clues: { clue: string; type: string; islamic: boolean }[];
    error?: string;
    storedClueIds?: string[];
  }> => {
    // Generate clues using fetch instead of ctx.runAction to avoid circular reference
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        word: args.word,
        clues: [],
        error: "ANTHROPIC_API_KEY not configured",
      };
    }

    const word = args.word.toUpperCase();
    const islamicContext = getIslamicContext(word, args.existingClue);
    const prompt = CLUE_PROMPT.replace(/\{word\}/g, word).replace(
      "{islamicContext}",
      islamicContext
    );

    let clues: { clue: string; type: string; islamic: boolean }[] = [];

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Parse JSON from response
      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse response");
        }
      }

      clues = parsedData.clues || [];
    } catch (error) {
      return {
        word,
        clues: [],
        error: String(error),
      };
    }

    if (clues.length === 0) {
      return { word, clues: [] };
    }

    // Store generated clues in database
    const storedClueIds = await ctx.runMutation(
      internal.clueGeneration.storeGeneratedClues,
      {
        wordId: args.wordId,
        word: args.word,
        clues: clues,
      }
    );

    return {
      word,
      clues,
      storedClueIds: storedClueIds.map(String),
    };
  },
});

// Internal mutation to store generated clues
export const storeGeneratedClues = internalMutation({
  args: {
    wordId: v.id("words"),
    word: v.string(),
    clues: v.array(
      v.object({
        clue: v.string(),
        type: v.string(),
        islamic: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ids = [];

    for (const clueData of args.clues) {
      const id = await ctx.db.insert("clues", {
        wordId: args.wordId,
        word: args.word.toUpperCase(),
        clue: clueData.clue,
        clueType: clueData.type,
        source: "ai-generated",
        isApproved: false, // AI clues need review
        usageCount: 0,
      });
      ids.push(id);
    }

    return ids;
  },
});
