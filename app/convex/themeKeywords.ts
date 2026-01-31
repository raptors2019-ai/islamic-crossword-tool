import { v } from "convex/values";
import { query, action } from "./_generated/server";

/**
 * Theme-based keyword selection for Islamic crossword puzzles.
 *
 * Provides themed word lists based on:
 * - Prophet Stories (first 50-60 puzzles focus)
 * - 99 Names of Allah
 * - Ramadan & Fasting
 * - 5 Pillars
 * - Custom themes
 */

// Theme definitions with word selection criteria
const THEME_DEFINITIONS = {
  prophets: {
    name: "Prophet Stories",
    description: "Stories of the messengers",
    categories: ["prophets"],
    keywords: [
      "ADAM",
      "NUH",
      "IBRAHIM",
      "MUSA",
      "ISA",
      "MUHAMMAD",
      "YUSUF",
      "DAWUD",
      "SULAIMAN",
      "AYYUB",
      "YUNUS",
      "IDRIS",
      "HUD",
      "SALIH",
      "YAHYA",
      "HARUN",
      "ISMAIL",
      "ISHAQ",
      "YAQUB",
    ],
    cluePatterns: [
      "prophet",
      "messenger",
      "revelation",
      "miracle",
      "sent to",
      "son of",
    ],
  },
  names: {
    name: "99 Names of Allah",
    description: "Beautiful names of Allah",
    categories: ["names-of-allah"],
    keywords: [
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
      "GHAFUR",
      "WADUD",
      "KABIR",
    ],
    cluePatterns: [
      "the all",
      "the most",
      "the ever",
      "name of allah",
      "attribute",
    ],
  },
  ramadan: {
    name: "Ramadan",
    description: "Fasting, prayers, spiritual growth",
    categories: ["general"],
    keywords: [
      "SAWM",
      "IFTAR",
      "SUHOOR",
      "FAJR",
      "TARAWEEH",
      "QURAN",
      "LAYLAT",
      "QADR",
      "EID",
      "FITR",
      "TAQWA",
      "DHUHR",
      "ASR",
      "MAGHRIB",
      "ISHA",
    ],
    cluePatterns: ["fast", "ramadan", "iftar", "suhoor", "prayer", "moon"],
  },
  pillars: {
    name: "5 Pillars",
    description: "Foundations of Islam",
    categories: ["general"],
    keywords: [
      "SHAHADA",
      "SALAH",
      "ZAKAT",
      "SAWM",
      "HAJJ",
      "FAJR",
      "KAABA",
      "MECCA",
      "TAWAF",
      "SAFA",
      "MARWA",
      "IHRAM",
      "UMRAH",
    ],
    cluePatterns: ["pillar", "pilgrimage", "prayer", "charity", "fast"],
  },
};

// Get recommended words for a theme (5x5 compatible only)
export const getThemeWords = query({
  args: {
    theme: v.string(),
    maxWords: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const themeKey = args.theme.toLowerCase();
    const themeDef =
      THEME_DEFINITIONS[themeKey as keyof typeof THEME_DEFINITIONS];
    const maxWords = args.maxWords || 15;

    // Get all words that fit 5x5 (max 5 letters)
    const allWords = await ctx.db.query("words").collect();
    const fiveLetterWords = allWords.filter((w) => w.length <= 5);

    let recommendedWords: typeof fiveLetterWords = [];

    if (themeDef) {
      // First: Get words from theme's keyword list
      const keywordSet = new Set(themeDef.keywords.map((k) => k.toUpperCase()));
      const keywordMatches = fiveLetterWords.filter((w) =>
        keywordSet.has(w.word)
      );
      recommendedWords.push(...keywordMatches);

      // Second: Get words from matching categories
      if (themeDef.categories.length > 0) {
        const categoryMatches = fiveLetterWords.filter(
          (w) =>
            themeDef.categories.includes(w.category) &&
            !keywordSet.has(w.word)
        );
        recommendedWords.push(...categoryMatches);
      }

      // Third: Get words with matching clue patterns
      const patternMatches = fiveLetterWords.filter((w) => {
        if (recommendedWords.find((rw) => rw._id === w._id)) return false;

        // Get clues for this word
        // For now we just check the word itself, but could expand to check clues
        return themeDef.cluePatterns.some((pattern) =>
          w.word.toLowerCase().includes(pattern.toLowerCase())
        );
      });
      recommendedWords.push(...patternMatches);
    } else {
      // For "surprise" or unknown themes, get a mix of high-scoring words
      recommendedWords = fiveLetterWords
        .filter((w) => w.score >= 80)
        .sort((a, b) => b.score - a.score);
    }

    // Sort by score and limit
    recommendedWords.sort((a, b) => b.score - a.score);
    recommendedWords = recommendedWords.slice(0, maxWords);

    return recommendedWords;
  },
});

// Get smart word suggestions based on current puzzle state
export const getSuggestions = query({
  args: {
    currentWords: v.array(v.string()), // Words already in puzzle
    neededLength: v.optional(v.number()), // Specific length needed
    theme: v.optional(v.string()),
    maxSuggestions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentWordSet = new Set(
      args.currentWords.map((w) => w.toUpperCase())
    );
    const maxSuggestions = args.maxSuggestions || 10;

    // Get all 5x5 compatible words
    const allWords = await ctx.db.query("words").collect();
    let candidates = allWords.filter(
      (w) => w.length <= 5 && !currentWordSet.has(w.word)
    );

    // Filter by needed length if specified
    if (args.neededLength) {
      candidates = candidates.filter((w) => w.length === args.neededLength);
    }

    // Filter by theme if specified
    if (args.theme) {
      const themeKey = args.theme.toLowerCase();
      const themeDef =
        THEME_DEFINITIONS[themeKey as keyof typeof THEME_DEFINITIONS];
      if (themeDef) {
        const keywordSet = new Set(
          themeDef.keywords.map((k) => k.toUpperCase())
        );
        candidates = candidates.filter(
          (w) =>
            keywordSet.has(w.word) ||
            themeDef.categories.includes(w.category)
        );
      }
    }

    // Sort by score and return top suggestions
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, maxSuggestions);
  },
});

// AI-powered theme analysis to generate relevant keywords
export const analyzeTheme = action({
  args: {
    themeText: v.string(), // e.g., "Story of Prophet Yusuf"
    maxKeywords: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    keywords: string[];
    suggestedCategory: string;
    error?: string;
  }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Fall back to keyword extraction without AI
      return {
        keywords: extractKeywordsFromText(args.themeText),
        suggestedCategory: "general",
      };
    }

    const maxKeywords = args.maxKeywords || 15;

    const prompt = `You are helping create an Islamic crossword puzzle. Given the theme "${args.themeText}", suggest ${maxKeywords} relevant words that:
1. Are 5 letters or less (max for 5x5 grid)
2. Are related to Islamic knowledge (prophets, Quran, worship, etc.)
3. Would make good crossword entries

Return ONLY a JSON object in this format (no markdown, no extra text):
{
  "keywords": ["WORD1", "WORD2", "WORD3"],
  "category": "prophets" or "names-of-allah" or "quran" or "general"
}`;

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
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

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

      return {
        keywords: parsedData.keywords || [],
        suggestedCategory: parsedData.category || "general",
      };
    } catch (error) {
      return {
        keywords: extractKeywordsFromText(args.themeText),
        suggestedCategory: "general",
        error: String(error),
      };
    }
  },
});

// Simple keyword extraction without AI
function extractKeywordsFromText(text: string): string[] {
  const keywords: string[] = [];

  // Check for prophet names
  const prophetNames = [
    "ADAM",
    "NUH",
    "IBRAHIM",
    "MUSA",
    "ISA",
    "MUHAMMAD",
    "YUSUF",
    "DAWUD",
    "SULAIMAN",
    "AYYUB",
    "YUNUS",
    "IDRIS",
    "HUD",
    "SALIH",
    "YAHYA",
  ];

  const textUpper = text.toUpperCase();
  for (const name of prophetNames) {
    if (textUpper.includes(name)) {
      keywords.push(name);
    }
  }

  // Add related Islamic terms if prophet mentioned
  if (keywords.length > 0) {
    keywords.push("QURAN", "ALLAH", "NABI", "DUA", "TAQWA");
  }

  return keywords.slice(0, 10);
}
