/**
 * Prophet-to-Keywords Mapping for Islamic Crossword Puzzles
 *
 * CRITICAL: Grid is ALWAYS 5x5. This is non-negotiable.
 * - All keywords MUST be 2-5 letters
 * - Keywords can appear under multiple prophets where stories overlap
 *
 * Each prophet has associated keywords from their stories.
 */

import { GRID_5X5_CONSTRAINTS } from './types';

// Strict constraints from the 5x5 grid rules
const MAX_LENGTH = GRID_5X5_CONSTRAINTS.maxWordLength; // 5
const MIN_LENGTH = GRID_5X5_CONSTRAINTS.minWordLength; // 2

export interface ProphetKeyword {
  word: string;
  clue: string;
  relevance: number; // 100 = directly related, 80 = related, 60 = tangentially related
}

export interface ProphetData {
  displayName: string;
  arabicName?: string;
  keywords: ProphetKeyword[];
}

export const PROPHET_KEYWORDS: Record<string, ProphetData> = {
  ADAM: {
    displayName: "Prophet Adam (AS)",
    arabicName: "آدم",
    keywords: [
      { word: "ADAM", clue: "First vicegerent placed on earth", relevance: 100 },
      { word: "HAWWA", clue: "Earliest matriarch", relevance: 100 },
      { word: "CLAY", clue: "The substance from which Allah molded the form of Adam", relevance: 100 },
      { word: "IBLIS", clue: "Satan in Islam", relevance: 95 },
      { word: "CROW", clue: "The bird which Allah sent to Qabil to demonstrate funeral rite", relevance: 90 },
      { word: "HABIL", clue: "The obedient son who offered his best camel as sacrifice", relevance: 90 },
      { word: "QABIL", clue: "Elder twin who committed the first criminal act on earth", relevance: 90 },
      { word: "HASTE", clue: "The quality man was created of, exemplified by Adam jumping for fruit", relevance: 80 },
    ],
  },

  NUH: {
    displayName: "Prophet Nuh (AS)",
    arabicName: "نوح",
    keywords: [
      { word: "NUH", clue: "Prophet who built the Ark", relevance: 100 },
      { word: "ARK", clue: "The mighty vessel constructed under Nuh (AS)", relevance: 100 },
      { word: "JUDI", clue: "The mountain where Nuh's Ark finally came to rest", relevance: 100 },
      { word: "PAIRS", clue: "How the animals were brought on Nuh's Ark", relevance: 95 },
      { word: "NOAH", clue: "English name for Prophet Nuh", relevance: 90 },
      { word: "WIND", clue: "The violent element in many prophetic stories", relevance: 80 },
    ],
  },

  IBRAHIM: {
    displayName: "Prophet Ibrahim (AS)",
    arabicName: "إبراهيم",
    keywords: [
      { word: "FIRE", clue: "The element that became coolness and safety for Ibrahim", relevance: 100 },
      { word: "AXE", clue: "The sharp tool Ibrahim used to smash the false gods", relevance: 100 },
      { word: "SARAH", clue: "Prophet Ibrahim's wife who accompanied him during migration", relevance: 95 },
      { word: "HAGAR", clue: "The mother of Ismail", relevance: 95 },
      { word: "LOT", clue: "Ibrahim's nephew who believed in his message", relevance: 90 },
      { word: "LUT", clue: "Ibrahim's nephew who believed in his message (Arabic)", relevance: 90 },
      { word: "ADHA", clue: "Eid Al-___ celebrating Ibrahim's sacrifice", relevance: 90 },
      { word: "DATES", clue: "Contents of what Prophet Ibrahim left Hagar in a leather pouch", relevance: 85 },
      { word: "IDOLS", clue: "Objects Ibrahim destroyed", relevance: 90 },
      { word: "THREE", clue: "How many angels visited Prophet Ibrahim and his wife", relevance: 85 },
    ],
  },

  ISMAIL: {
    displayName: "Prophet Ismail (AS)",
    arabicName: "إسماعيل",
    keywords: [
      { word: "HAGAR", clue: "The mother of Ismail", relevance: 100 },
      { word: "SAI", clue: "Ritual walking between Safa and Marwa", relevance: 95 },
      { word: "MECCA", clue: "City where Ismail helped build the Kaaba", relevance: 95 },
      { word: "ADHA", clue: "Eid celebrating the sacrifice story", relevance: 90 },
    ],
  },

  ISHAQ: {
    displayName: "Prophet Ishaq (AS)",
    arabicName: "إسحاق",
    keywords: [
      { word: "ISHAQ", clue: "Son born to Sarah after glad tidings from angels", relevance: 100 },
      { word: "ISAAC", clue: "English name for Prophet Ishaq", relevance: 95 },
      { word: "SARAH", clue: "Mother of Ishaq", relevance: 95 },
      { word: "THREE", clue: "Number of angels who brought glad tidings", relevance: 85 },
    ],
  },

  YAQUB: {
    displayName: "Prophet Yaqub (AS)",
    arabicName: "يعقوب",
    keywords: [
      { word: "YAQUB", clue: "The famous father of twelve sons", relevance: 100 },
      { word: "JACOB", clue: "English name for Prophet Yaqub", relevance: 95 },
      { word: "BLIND", clue: "Condition of Yaqub from grief over Yusuf", relevance: 95 },
      { word: "SHIRT", clue: "Item that restored Yaqub's sight", relevance: 90 },
    ],
  },

  YUSUF: {
    displayName: "Prophet Yusuf (AS)",
    arabicName: "يوسف",
    keywords: [
      { word: "YUSUF", clue: "Man who was given half the world's beauty", relevance: 100 },
      { word: "WELL", clue: "The desolate place where Yusuf was cast by his brothers", relevance: 100 },
      { word: "DREAM", clue: "Pharaoh had one, Yusuf interpreted one", relevance: 100 },
      { word: "EGYPT", clue: "Country where Yusuf rose to power", relevance: 100 },
      { word: "AZIZ", clue: "Chief minister of Egypt who purchased Yusuf", relevance: 95 },
      { word: "CUP", clue: "What was placed in Binyamin's bag", relevance: 90 },
      { word: "SHIRT", clue: "Item torn from the back, proving Yusuf was fleeing", relevance: 90 },
    ],
  },

  AYYUB: {
    displayName: "Prophet Ayyub (AS)",
    arabicName: "أيوب",
    keywords: [
      { word: "AYYUB", clue: "The Prophet who lost fourteen children", relevance: 100 },
      { word: "SEVEN", clue: "Years Ayyub suffered from his severe affliction", relevance: 95 },
      { word: "JOB", clue: "English name for Prophet Ayyub", relevance: 90 },
    ],
  },

  MUSA: {
    displayName: "Prophet Musa (AS)",
    arabicName: "موسى",
    keywords: [
      { word: "MUSA", clue: "Prophet who spoke directly with Allah", relevance: 100 },
      { word: "STAFF", clue: "Object that miraculously transformed into a serpent", relevance: 100 },
      { word: "NILE", clue: "River where infant Musa was cast in a basket", relevance: 100 },
      { word: "HARUN", clue: "Elder brother of Prophet Musa", relevance: 100 },
      { word: "SINAI", clue: "Mount where Musa first heard the voice of Allah", relevance: 100 },
      { word: "CALF", clue: "Golden animal worshipped in Musa's absence", relevance: 95 },
      { word: "TORAH", clue: "Scripture given to Musa", relevance: 95 },
      { word: "FIRE", clue: "Burning bush where Musa received revelation", relevance: 90 },
      { word: "KHIDR", clue: "Wise man Prophet Musa met (Al-___)", relevance: 90 },
      { word: "QARUN", clue: "Wealthy man swallowed by earth in Musa's time", relevance: 85 },
      { word: "MOSES", clue: "English name for Prophet Musa", relevance: 90 },
      { word: "MANNA", clue: "Miraculous food for wandering Israelites", relevance: 85 },
      { word: "BLOOD", clue: "Final plague that turned the river red", relevance: 80 },
    ],
  },

  HARUN: {
    displayName: "Prophet Harun (AS)",
    arabicName: "هارون",
    keywords: [
      { word: "HARUN", clue: "Elder brother of Prophet Musa", relevance: 100 },
      { word: "AARON", clue: "English equivalent to Prophet Harun", relevance: 95 },
      { word: "MUSA", clue: "Younger brother of Harun", relevance: 90 },
      { word: "CALF", clue: "Golden idol worshipped while Harun was guardian", relevance: 85 },
    ],
  },

  DAWUD: {
    displayName: "Prophet Dawud (AS)",
    arabicName: "داود",
    keywords: [
      { word: "DAWUD", clue: "Prophet who fought and killed Goliath", relevance: 100 },
      { word: "IRON", clue: "Metal Allah made soft and flexible for Dawud", relevance: 100 },
      { word: "ZABUR", clue: "Scripture revealed to Prophet Dawud", relevance: 100 },
      { word: "SLING", clue: "Simple weapon used by youth Dawud", relevance: 95 },
      { word: "JALUT", clue: "Giant killed by Dawud", relevance: 95 },
      { word: "DAVID", clue: "English equivalent to Prophet Dawud", relevance: 90 },
    ],
  },

  SULAIMAN: {
    displayName: "Prophet Sulaiman (AS)",
    arabicName: "سليمان",
    keywords: [
      { word: "ANT", clue: "Creature whose warning caused Sulaiman to smile", relevance: 100 },
      { word: "ANTS", clue: "Insects that Sulaiman overheard", relevance: 100 },
      { word: "JINN", clue: "Creatures Sulaiman commanded", relevance: 95 },
      { word: "GLASS", clue: "Material floor Queen Bilqis mistook for water", relevance: 95 },
      { word: "SHEBA", clue: "Bilqis was Queen of ___", relevance: 95 },
      { word: "WIND", clue: "Element Sulaiman could command", relevance: 90 },
    ],
  },

  YUNUS: {
    displayName: "Prophet Yunus (AS)",
    arabicName: "يونس",
    keywords: [
      { word: "YUNUS", clue: "Arabic name of Prophet Jonah", relevance: 100 },
      { word: "WHALE", clue: "Sea creature that served as prison for Yunus", relevance: 100 },
      { word: "FISH", clue: "Quran refers to Yunus as Man of the ___", relevance: 95 },
      { word: "NIGHT", clue: "One of three layers of darkness Yunus was engulfed in", relevance: 90 },
      { word: "JONAH", clue: "English name for Prophet Yunus", relevance: 90 },
    ],
  },

  IDRIS: {
    displayName: "Prophet Idris (AS)",
    arabicName: "إدريس",
    keywords: [
      { word: "IDRIS", clue: "First man who learned how to write", relevance: 100 },
      { word: "ENOCH", clue: "English name associated with Prophet Idris", relevance: 85 },
      { word: "WISE", clue: "Attribute of Prophet Idris's teachings", relevance: 80 },
    ],
  },

  HUD: {
    displayName: "Prophet Hud (AS)",
    arabicName: "هود",
    keywords: [
      { word: "HUD", clue: "Warner sent to the arrogant people of 'Ad", relevance: 100 },
      { word: "AD", clue: "Community to whom Allah sent Prophet Hud", relevance: 100 },
      { word: "WIND", clue: "Violent element that destroyed 'Ad for eight days", relevance: 95 },
      { word: "IDOLS", clue: "Objects the people of 'Ad worshipped", relevance: 90 },
    ],
  },

  SALIH: {
    displayName: "Prophet Salih (AS)",
    arabicName: "صالح",
    keywords: [
      { word: "SALIH", clue: "Prophet sent to guide the people of Thamud", relevance: 100 },
      { word: "MILK", clue: "She-camel's provision from story of Prophet Salih", relevance: 95 },
    ],
  },

  SHUAIB: {
    displayName: "Prophet Shuaib (AS)",
    arabicName: "شعيب",
    keywords: [
      { word: "WOOD", clue: "Community Ashab al-Aykah, Companions of the ___", relevance: 90 },
    ],
  },

  LUT: {
    displayName: "Prophet Lut (AS)",
    arabicName: "لوط",
    keywords: [
      { word: "LUT", clue: "Ibrahim's nephew sent to Sodom", relevance: 100 },
      { word: "LOT", clue: "English name for Prophet Lut", relevance: 95 },
    ],
  },

  YAHYA: {
    displayName: "Prophet Yahya (AS)",
    arabicName: "يحيى",
    keywords: [
      { word: "YAHYA", clue: "Son granted to Prophet Zakariya", relevance: 100 },
      { word: "JOHN", clue: "English equivalent for son of Zakariyah", relevance: 95 },
      { word: "SON", clue: "Yahya was ___ to Prophet Zakariyah", relevance: 90 },
      { word: "WEPT", clue: "What Yahya frequently did in fear of Allah", relevance: 85 },
      { word: "HUKM", clue: "Good judgment given to Yahya", relevance: 80 },
    ],
  },

  ZAKARIYA: {
    displayName: "Prophet Zakariya (AS)",
    arabicName: "زكريا",
    keywords: [
      { word: "YAHYA", clue: "Son granted to Zakariya", relevance: 100 },
      { word: "JOHN", clue: "English name for Zakariya's son", relevance: 90 },
      { word: "FRUIT", clue: "Miraculous provision found in Maryam's sanctuary", relevance: 85 },
    ],
  },

  ISA: {
    displayName: "Prophet Isa (AS)",
    arabicName: "عيسى",
    keywords: [
      { word: "ISA", clue: "Prophet and messenger born without a father", relevance: 100 },
      { word: "INJIL", clue: "The book of Isa", relevance: 100 },
      { word: "MARY", clue: "Among the women who attained perfection", relevance: 100 },
      { word: "JESUS", clue: "English name for Prophet Isa", relevance: 95 },
      { word: "FEAST", clue: "What Isa brought to the table", relevance: 90 },
      { word: "TABLE", clue: "The Last Supper - Table Spread", relevance: 90 },
    ],
  },

  MUHAMMAD: {
    displayName: "Prophet Muhammad (SAW)",
    arabicName: "محمد",
    keywords: [
      { word: "MECCA", clue: "Birthplace of Prophet Muhammad (SAW)", relevance: 100 },
      { word: "HIRA", clue: "Name of cave with first revelation", relevance: 100 },
      { word: "HIJRA", clue: "Journey from Mecca to Medina", relevance: 100 },
      { word: "BURAQ", clue: "Used for the night journey to Jerusalem", relevance: 95 },
      { word: "BADR", clue: "Valley where small Muslim force defeated Meccans", relevance: 95 },
      { word: "UHUD", clue: "Hill north of Medina where significant battle occurred", relevance: 95 },
      { word: "ANSAR", clue: "The Helpers of Medina", relevance: 90 },
      { word: "QURAN", clue: "Final scripture revealed to Muhammad", relevance: 100 },
      { word: "FIVE", clue: "Ten percent of the original Mi'raj mandate", relevance: 85 },
      { word: "KILL", clue: "What Meccan leaders tried before emigration", relevance: 80 },
      { word: "BAYT", clue: "Ahl-Al ___ (Family of Muhammad)", relevance: 85 },
      { word: "EID", clue: "Islamic holiday", relevance: 85 },
    ],
  },
};

// Get all prophet IDs for the dropdown
export const PROPHET_IDS = Object.keys(PROPHET_KEYWORDS);

/**
 * Get keywords for a specific prophet.
 * STRICT: Only returns words that fit the 5x5 grid (2-5 letters).
 */
export function getKeywordsForProphet(prophetId: string): ProphetKeyword[] {
  const prophet = PROPHET_KEYWORDS[prophetId.toUpperCase()];
  if (!prophet) return [];

  // STRICT: Filter to only words valid for 5x5 grid
  return prophet.keywords
    .filter(k => k.word.length >= MIN_LENGTH && k.word.length <= MAX_LENGTH)
    .sort((a, b) => b.relevance - a.relevance);
}

// Get prophet display name
export function getProphetDisplayName(prophetId: string): string {
  const prophet = PROPHET_KEYWORDS[prophetId.toUpperCase()];
  return prophet?.displayName || prophetId;
}

/**
 * Search keywords across all prophets.
 * STRICT: Only returns words that fit the 5x5 grid (2-5 letters).
 */
export function searchKeywords(
  query: string
): { prophetId: string; keyword: ProphetKeyword }[] {
  const results: { prophetId: string; keyword: ProphetKeyword }[] = [];
  const queryUpper = query.toUpperCase();

  for (const [prophetId, data] of Object.entries(PROPHET_KEYWORDS)) {
    for (const keyword of data.keywords) {
      // STRICT: Only include words valid for 5x5 grid
      if (
        keyword.word.length >= MIN_LENGTH &&
        keyword.word.length <= MAX_LENGTH &&
        (keyword.word.includes(queryUpper) ||
          keyword.clue.toUpperCase().includes(queryUpper))
      ) {
        results.push({ prophetId, keyword });
      }
    }
  }

  return results.sort((a, b) => b.keyword.relevance - a.keyword.relevance);
}
