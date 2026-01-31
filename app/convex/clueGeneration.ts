import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * AI-powered clue generation using Anthropic Claude API.
 *
 * Generates 7-10 clue options per word based on the cruciverbist prompt.
 */

// Clue generation prompt template
const CLUE_PROMPT = `You are an expert cruciverbist (crossword puzzle creator) in the style of Patrick Barry and Will Shortz, specializing in Islamic-themed crossword puzzles.

Generate 7-10 diverse clue options for the word: {word}

Context:
- This is for a 5x5 Islamic crossword puzzle (simple format)
- Target audience: Muslims of all ages
- Clues should be challenging but not too obscure
- Prioritize clues with Islamic connections when possible
- Use "___" (three underscores) for blanks in clues

{islamicContext}

Clue Types to Include:
1. **Analogy clues** - Using "A:B::C:?" format or comparisons
2. **Clever dictionary clues** - Wordplay on definitions
3. **Simple straightforward clues** - Direct definitions
4. **Familiar phrase clues** - "_____ in the morning" style
5. **Idiom clues** - Based on common expressions
6. **Sneaky clues** - Misdirection or double meanings

Return EXACTLY this JSON format (no markdown, no extra text):
{
  "word": "{word}",
  "clues": [
    {"clue": "clue text here", "type": "simple", "islamic": true},
    {"clue": "another clue", "type": "analogy", "islamic": false}
  ]
}

Requirements:
- Generate exactly 7-10 clues
- Each clue must be unique and different in approach
- At least 3 clues should have Islamic connections if the word is Islamic
- Clues should be suitable for all ages
- No offensive or controversial content
- Keep clues concise (under 100 characters each)`;

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
    clues: { clue: string; type: string; islamic: boolean }[];
    error?: string;
  }> => {
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

      return {
        word,
        clues: parsedData.clues || [],
      };
    } catch (error) {
      return {
        word,
        clues: [],
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
