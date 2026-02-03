/**
 * Prophet-to-Keywords Mapping for Islamic Crossword Puzzles
 *
 * CRITICAL: Grid is ALWAYS 5x5. This is non-negotiable.
 * - All keywords MUST be 2-5 letters
 * - Keywords can appear under multiple prophets where stories overlap
 *
 * Each prophet has associated keywords from their stories.
 *
 * NOTE: This file now serves as fallback data. The primary source
 * is the Convex prophetKeywords table, which aggregates data from:
 * - puzzle-archive: Proven clues from 34 existing puzzles
 * - word-list: Curated entries from prophet stories word list
 * - scraped: AI-extracted from myislam.org (needs review)
 */

import { GRID_5X5_CONSTRAINTS } from './types';

// Strict constraints from the 5x5 grid rules
const MAX_LENGTH = GRID_5X5_CONSTRAINTS.maxWordLength; // 5
const MIN_LENGTH = GRID_5X5_CONSTRAINTS.minWordLength; // 2

// Source types for keywords
export type KeywordSource = 'puzzle-archive' | 'word-list' | 'scraped' | 'local';

export interface ProphetKeyword {
  word: string;
  clue: string;
  relevance: number; // 100 = directly related, 80 = related, 60 = tangentially related
  source?: KeywordSource; // Where this keyword came from
  sourceDetails?: string; // Additional source info (e.g., puzzle name)
  isApproved?: boolean; // For scraped keywords that need review
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
      { word: "SETH", clue: "Adam's successor prophet (Sheeth)", relevance: 85, source: 'scraped' },
      { word: "SOUL", clue: "What Allah breathed into Adam", relevance: 90, source: 'scraped' },
      { word: "TREE", clue: "The forbidden tree in paradise", relevance: 85, source: 'scraped' },
      { word: "FRUIT", clue: "What Adam ate from forbidden tree", relevance: 80, source: 'scraped' },
      { word: "LAMB", clue: "Habil's sacrifice to Allah", relevance: 85, source: 'scraped' },
      { word: "EARTH", clue: "Where Adam was sent after paradise", relevance: 80, source: 'scraped' },
      { word: "TWINS", clue: "Qabil and Habil were ___", relevance: 85, source: 'scraped' },
      { word: "NAMES", clue: "Adam was taught the ___ of all things", relevance: 90, source: 'scraped' },
      { word: "SALAM", clue: "Greeting Adam was taught", relevance: 85, source: 'scraped' },
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
      { word: "FLOOD", clue: "The great flood that destroyed disbelievers", relevance: 95, source: 'scraped' },
      { word: "OVEN", clue: "Water first gushed from Nuh's ___", relevance: 85, source: 'scraped' },
      { word: "RAIN", clue: "Heavy rains of the flood", relevance: 80, source: 'scraped' },
      { word: "WAVE", clue: "Angry waves that engulfed disbelievers", relevance: 85, source: 'scraped' },
      { word: "SON", clue: "Nuh's disbelieving son who drowned", relevance: 85, source: 'scraped' },
      { word: "WADD", clue: "Name of an idol worshipped by Nuh's people", relevance: 80, source: 'scraped' },
      { word: "SUWA", clue: "Name of an idol worshipped by Nuh's people", relevance: 80, source: 'scraped' },
      { word: "NASR", clue: "Name of an idol worshipped by Nuh's people", relevance: 80, source: 'scraped' },
      { word: "IDOLS", clue: "Objects Nuh's people worshipped", relevance: 85, source: 'scraped' },
      { word: "WOOD", clue: "Material of Nuh's Ark", relevance: 80, source: 'scraped' },
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
      { word: "ISHAQ", clue: "Son born to Sarah", relevance: 95, source: 'scraped' },
      { word: "ISAAC", clue: "English name for Ishaq", relevance: 90, source: 'scraped' },
      { word: "BIRD", clue: "Four birds in resurrection miracle", relevance: 85, source: 'scraped' },
      { word: "FOUR", clue: "Four birds Ibrahim was shown", relevance: 80, source: 'scraped' },
      { word: "MECCA", clue: "City Ibrahim traveled to", relevance: 90, source: 'scraped' },
      { word: "IRAQ", clue: "Born in Babylon/Iraq", relevance: 80, source: 'scraped' },
      { word: "STARS", clue: "Celestial body he debated about", relevance: 85, source: 'scraped' },
      { word: "MOON", clue: "Celestial body he debated about", relevance: 85, source: 'scraped' },
      { word: "SUN", clue: "Celestial body he debated about", relevance: 85, source: 'scraped' },
      { word: "HANIF", clue: "Pure monotheist - Ibrahim was a ___", relevance: 90, source: 'scraped' },
      { word: "CAVE", clue: "Where Ibrahim pondered creation", relevance: 80, source: 'scraped' },
      { word: "CALF", clue: "Slaughtered for angel guests", relevance: 80, source: 'scraped' },
      { word: "BURN", clue: "They tried to ___ him", relevance: 85, source: 'scraped' },
      { word: "COOL", clue: "Fire became ___ for Ibrahim", relevance: 85, source: 'scraped' },
      { word: "UR", clue: "Ancient city where Ibrahim was born", relevance: 80, source: 'scraped' },
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
      { word: "KAABA", clue: "Built by Ibrahim and Ismail", relevance: 100, source: 'scraped' },
      { word: "WATER", clue: "Zamzam ___ appeared for Ismail", relevance: 95, source: 'scraped' },
      { word: "SEVEN", clue: "Hagar ran ___ times between hills", relevance: 85, source: 'scraped' },
      { word: "DREAM", clue: "Ibrahim saw sacrifice in a ___", relevance: 90, source: 'scraped' },
      { word: "RAM", clue: "Animal sacrificed instead of Ismail", relevance: 95, source: 'scraped' },
      { word: "STONE", clue: "Stones thrown at Shaytan", relevance: 85, source: 'scraped' },
      { word: "ARROW", clue: "Ismail was skilled with arrows", relevance: 80, source: 'scraped' },
      { word: "KNIFE", clue: "Ibrahim's ___ for sacrifice", relevance: 90, source: 'scraped' },
      { word: "HAJJ", clue: "Pilgrimage rituals from Ismail's story", relevance: 90, source: 'scraped' },
      { word: "SAFA", clue: "Hill where Hagar searched for water", relevance: 85, source: 'scraped' },
      { word: "DATES", clue: "Food left for Hagar and Ismail", relevance: 80, source: 'scraped' },
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
      { word: "ANGEL", clue: "Three ___ brought glad tidings", relevance: 90, source: 'local' },
      { word: "SMILE", clue: "Sarah's reaction to news", relevance: 85, source: 'local' },
      { word: "SON", clue: "Glad tidings of a righteous ___", relevance: 85, source: 'local' },
      { word: "ESAU", clue: "Ishaq's firstborn twin", relevance: 85, source: 'local' },
      { word: "TWINS", clue: "Ishaq fathered ___ sons", relevance: 85, source: 'local' },
      { word: "OLD", clue: "Born when parents were very ___", relevance: 80, source: 'local' },
      { word: "GLAD", clue: "___ tidings of Ishaq", relevance: 80, source: 'local' },
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
      { word: "STARS", clue: "Eleven ___ in Yusuf's dream", relevance: 90, source: 'local' },
      { word: "TEARS", clue: "Wept until blind", relevance: 90, source: 'local' },
      { word: "SABR", clue: "Beautiful patience", relevance: 90, source: 'local' },
      { word: "SMELL", clue: "I detect the scent of Yusuf", relevance: 85, source: 'local' },
      { word: "DREAM", clue: "Yusuf's prophetic vision", relevance: 90, source: 'local' },
      { word: "GATE", clue: "Enter from different ___", relevance: 85, source: 'local' },
      { word: "MOON", clue: "Bowed in Yusuf's dream", relevance: 85, source: 'local' },
      { word: "SUN", clue: "Bowed in Yusuf's dream", relevance: 85, source: 'local' },
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
      { word: "WOLF", clue: "Brothers claimed ___ ate Yusuf", relevance: 95, source: 'scraped' },
      { word: "STARS", clue: "Eleven ___ bowed in Yusuf's dream", relevance: 90, source: 'scraped' },
      { word: "SUN", clue: "___ bowed in Yusuf's dream", relevance: 85, source: 'scraped' },
      { word: "MOON", clue: "___ bowed in Yusuf's dream", relevance: 85, source: 'scraped' },
      { word: "KING", clue: "Yusuf served the ___ of Egypt", relevance: 85, source: 'scraped' },
      { word: "JAIL", clue: "Yusuf was imprisoned unjustly", relevance: 95, source: 'scraped' },
      { word: "BAKER", clue: "Fellow prisoner whose dream Yusuf interpreted", relevance: 85, source: 'scraped' },
      { word: "GRAIN", clue: "Yusuf managed ___ stores during famine", relevance: 90, source: 'scraped' },
      { word: "SEVEN", clue: "Years of plenty and famine", relevance: 90, source: 'scraped' },
      { word: "FAT", clue: "Seven ___ cows in Pharaoh's dream", relevance: 85, source: 'scraped' },
      { word: "LEAN", clue: "Seven ___ cows in Pharaoh's dream", relevance: 85, source: 'scraped' },
      { word: "TRIAL", clue: "Yusuf faced many trials", relevance: 80, source: 'puzzle-archive' },
    ],
  },

  AYYUB: {
    displayName: "Prophet Ayyub (AS)",
    arabicName: "أيوب",
    keywords: [
      { word: "AYYUB", clue: "The Prophet who lost fourteen children", relevance: 100 },
      { word: "SEVEN", clue: "Years Ayyub suffered from his severe affliction", relevance: 95 },
      { word: "JOB", clue: "English name for Prophet Ayyub", relevance: 90 },
      { word: "RAIN", clue: "Golden locusts rained as blessing", relevance: 90, source: 'local' },
      { word: "SABR", clue: "Beautiful patience", relevance: 95, source: 'local' },
      { word: "ROME", clue: "Land where Ayyub lived", relevance: 80, source: 'local' },
      { word: "GRASS", clue: "Bundle to fulfill his oath", relevance: 85, source: 'local' },
      { word: "OATH", clue: "He swore about his wife", relevance: 85, source: 'local' },
      { word: "RAHMA", clue: "His loyal wife through suffering", relevance: 90, source: 'local' },
      { word: "SKIN", clue: "His ___ was afflicted", relevance: 85, source: 'local' },
      { word: "GOLD", clue: "___ locusts as blessing", relevance: 80, source: 'local' },
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
      { word: "SNAKE", clue: "Staff turned into ___", relevance: 95, source: 'scraped' },
      { word: "HAND", clue: "Musa's glowing white ___", relevance: 90, source: 'scraped' },
      { word: "WHITE", clue: "His hand shone ___", relevance: 85, source: 'scraped' },
      { word: "ARK", clue: "Basket that carried baby Musa", relevance: 85, source: 'scraped' },
      { word: "BUSH", clue: "Burning ___ where Musa saw fire", relevance: 90, source: 'scraped' },
      { word: "SHOE", clue: "Musa removed his shoes at the burning bush", relevance: 80, source: 'scraped' },
      { word: "SEA", clue: "Red ___ that parted for Musa", relevance: 95, source: 'scraped' },
      { word: "SPLIT", clue: "Sea ___ for Musa and Bani Israel", relevance: 90, source: 'scraped' },
      { word: "TEN", clue: "___ commandments / plagues", relevance: 85, source: 'scraped' },
      { word: "GOLD", clue: "Golden calf material", relevance: 80, source: 'scraped' },
      { word: "BOAT", clue: "___ Khidr damaged", relevance: 80, source: 'scraped' },
      { word: "FISH", clue: "___ that came alive in Musa's journey", relevance: 85, source: 'scraped' },
      { word: "WALL", clue: "___ Khidr repaired", relevance: 80, source: 'scraped' },
      { word: "FORTY", clue: "___ nights on Mount Sinai", relevance: 85, source: 'scraped' },
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
      { word: "SPEAK", clue: "Harun was eloquent and could ___ well", relevance: 90 },
      { word: "AIDE", clue: "Harun served as Musa's helper and ___", relevance: 85 },
      { word: "SINAI", clue: "Mountain where Musa and Harun received guidance", relevance: 80 },
      { word: "ELDER", clue: "Harun was the ___ brother", relevance: 80 },
      { word: "STAFF", clue: "Harun also carried a ___", relevance: 75 },
      { word: "TORAH", clue: "Scripture Harun helped teach", relevance: 75 },
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
      { word: "TALUT", clue: "King who led army with Dawud", relevance: 90, source: 'scraped' },
      { word: "STONE", clue: "Dawud's ___ killed Jalut", relevance: 90, source: 'scraped' },
      { word: "BIRD", clue: "Birds praised Allah with Dawud", relevance: 85, source: 'scraped' },
      { word: "PSALM", clue: "Dawud received Zabur (Psalms)", relevance: 85, source: 'scraped' },
      { word: "CAVE", clue: "Dawud hid in caves", relevance: 80, source: 'scraped' },
      { word: "SHEEP", clue: "Dawud was a shepherd", relevance: 80, source: 'scraped' },
      { word: "ARMOR", clue: "Dawud made ___ from iron", relevance: 85, source: 'scraped' },
      { word: "KING", clue: "Dawud became ___", relevance: 85, source: 'scraped' },
      { word: "LION", clue: "Dawud fought lions as shepherd", relevance: 80, source: 'scraped' },
      { word: "BEAR", clue: "Dawud fought bears as shepherd", relevance: 80, source: 'scraped' },
      { word: "FAST", clue: "Dawud fasted every other day", relevance: 85, source: 'scraped' },
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
      { word: "BIRD", clue: "Hoopoe ___ served Sulaiman", relevance: 90, source: 'scraped' },
      { word: "HORSE", clue: "Sulaiman loved horses", relevance: 85, source: 'scraped' },
      { word: "STAFF", clue: "Sulaiman leaned on his ___", relevance: 85, source: 'scraped' },
      { word: "QUEEN", clue: "___ of Sheba visited Sulaiman", relevance: 90, source: 'scraped' },
      { word: "SABA", clue: "Kingdom of Sheba (Arabic)", relevance: 90, source: 'scraped' },
      { word: "YEMEN", clue: "Location of Sheba", relevance: 80, source: 'scraped' },
      { word: "DIVER", clue: "Jinn dived for pearls", relevance: 80, source: 'scraped' },
      { word: "RING", clue: "Sulaiman's ___ of power", relevance: 85, source: 'scraped' },
      { word: "GIFT", clue: "Queen's gifts to Sulaiman", relevance: 80, source: 'scraped' },
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
      { word: "SEA", clue: "Yunus was thrown into the ___", relevance: 90, source: 'scraped' },
      { word: "DARK", clue: "Three darknesses surrounding Yunus", relevance: 85, source: 'scraped' },
      { word: "BELLY", clue: "Yunus prayed in whale's ___", relevance: 90, source: 'scraped' },
      { word: "TREE", clue: "Gourd ___ shaded Yunus", relevance: 85, source: 'scraped' },
      { word: "GOURD", clue: "Plant that grew over Yunus", relevance: 85, source: 'scraped' },
      { word: "LEAF", clue: "Leaves shaded weak Yunus", relevance: 80, source: 'scraped' },
      { word: "SHIP", clue: "Yunus fled on a ___", relevance: 90, source: 'scraped' },
      { word: "LOTS", clue: "___ cast to throw someone overboard", relevance: 85, source: 'scraped' },
      { word: "STORM", clue: "___ that endangered the ship", relevance: 85, source: 'scraped' },
      { word: "SHADE", clue: "Tree provided ___ for Yunus", relevance: 80, source: 'scraped' },
    ],
  },

  IDRIS: {
    displayName: "Prophet Idris (AS)",
    arabicName: "إدريس",
    keywords: [
      { word: "IDRIS", clue: "First man who learned how to write", relevance: 100 },
      { word: "ENOCH", clue: "English name associated with Prophet Idris", relevance: 85 },
      { word: "WISE", clue: "Attribute of Prophet Idris's teachings", relevance: 80 },
      { word: "STARS", clue: "Idris studied the ___", relevance: 90, source: 'local' },
      { word: "RISE", clue: "Allah raised him to a high station", relevance: 90, source: 'local' },
      { word: "TRUE", clue: "He was a man of truth", relevance: 85, source: 'local' },
      { word: "PEN", clue: "First to write with a ___", relevance: 90, source: 'local' },
      { word: "NUH", clue: "Idris was Nuh's great-grandfather", relevance: 85, source: 'local' },
      { word: "CLOTH", clue: "First to make ___ from skins", relevance: 80, source: 'local' },
      { word: "HIGH", clue: "Raised to a ___ station", relevance: 80, source: 'local' },
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
      { word: "IRAM", clue: "Ancient city with lofty pillars", relevance: 90, source: 'scraped' },
      { word: "EIGHT", clue: "Days the wind destroyed 'Ad", relevance: 85, source: 'scraped' },
      { word: "SEVEN", clue: "Nights the wind raged", relevance: 85, source: 'scraped' },
      { word: "PALM", clue: "'Ad were left like hollow ___ trunks", relevance: 85, source: 'scraped' },
      { word: "TOWER", clue: "Lofty constructions 'Ad built", relevance: 80, source: 'scraped' },
      { word: "GALE", clue: "Ferocious gale that destroyed 'Ad", relevance: 85, source: 'scraped' },
      // Friendly keywords (high letter scores)
      { word: "STORM", clue: "Violent ___ destroyed 'Ad", relevance: 90, source: 'local' },
      { word: "RUINS", clue: "All that remained of 'Ad", relevance: 85, source: 'local' },
      { word: "SAND", clue: "'Ad were buried in the ___", relevance: 85, source: 'local' },
      { word: "NIGHT", clue: "Seven ___s the wind raged", relevance: 85, source: 'local' },
      { word: "STONE", clue: "'Ad carved homes from ___", relevance: 85, source: 'local' },
      { word: "SENT", clue: "Hud was ___ as a warner", relevance: 80, source: 'local' },
    ],
  },

  SALIH: {
    displayName: "Prophet Salih (AS)",
    arabicName: "صالح",
    keywords: [
      { word: "SALIH", clue: "Prophet sent to guide the people of Thamud", relevance: 100 },
      { word: "SALEH", clue: "Alternate spelling of Prophet Salih", relevance: 95 },
      { word: "MILK", clue: "She-camel's provision from story of Prophet Salih", relevance: 95 },
      { word: "CAMEL", clue: "The she-camel miracle of Allah", relevance: 100, source: 'scraped' },
      { word: "ROCK", clue: "The camel emerged from a ___", relevance: 90, source: 'scraped' },
      { word: "THREE", clue: "Days warning before punishment", relevance: 85, source: 'scraped' },
      { word: "HIJR", clue: "Location Al-Hijr (Madain Saleh)", relevance: 90, source: 'scraped' },
      { word: "NINE", clue: "___ conspirators who killed the camel", relevance: 85, source: 'scraped' },
      { word: "AMIN", clue: "Trustworthy - quality Salih had before prophethood", relevance: 80, source: 'scraped' },
    ],
  },

  SHUAIB: {
    displayName: "Prophet Shuaib (AS)",
    arabicName: "شعيب",
    keywords: [
      { word: "WOOD", clue: "Community Ashab al-Aykah, Companions of the ___", relevance: 90 },
      { word: "TRADE", clue: "Shuaib warned against dishonest ___", relevance: 95, source: 'local' },
      { word: "SCALE", clue: "Weigh with honest ___", relevance: 95, source: 'local' },
      { word: "STONE", clue: "Rained on disbelievers", relevance: 85, source: 'local' },
      { word: "SHEEP", clue: "Flock given to Musa", relevance: 85, source: 'local' },
      { word: "STORM", clue: "Dark cloud before punishment", relevance: 85, source: 'local' },
      { word: "MUSA", clue: "Shuaib's son-in-law", relevance: 90, source: 'local' },
      { word: "TEN", clue: "Years Musa agreed to work", relevance: 80, source: 'local' },
      { word: "HEAT", clue: "Scorching ___ preceded punishment", relevance: 80, source: 'local' },
    ],
  },

  LUT: {
    displayName: "Prophet Lut (AS)",
    arabicName: "لوط",
    keywords: [
      { word: "LUT", clue: "Ibrahim's nephew sent to Sodom", relevance: 100 },
      { word: "LOT", clue: "English name for Prophet Lut", relevance: 95 },
      { word: "SODOM", clue: "City of Lut's sinful people", relevance: 95, source: 'scraped' },
      { word: "WIFE", clue: "Lut's ___ who disobeyed", relevance: 85, source: 'scraped' },
      { word: "STONE", clue: "Stones rained on Lut's people", relevance: 90, source: 'scraped' },
      { word: "RAIN", clue: "___ of stones on the sinful city", relevance: 85, source: 'scraped' },
      { word: "ANGEL", clue: "Angels visited Lut as guests", relevance: 90, source: 'scraped' },
      { word: "DAWN", clue: "Time when punishment came", relevance: 80, source: 'scraped' },
      { word: "GUEST", clue: "Lut protected his ___", relevance: 85, source: 'scraped' },
      { word: "BLIND", clue: "Angels struck wrongdoers ___", relevance: 80, source: 'scraped' },
      { word: "TOWN", clue: "The ___ that was destroyed", relevance: 80, source: 'scraped' },
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
      // Friendly keywords (high letter scores)
      { word: "TEARS", clue: "Yahya shed many ___ in devotion", relevance: 90, source: 'local' },
      { word: "ALONE", clue: "Lived as an ascetic, often ___", relevance: 85, source: 'local' },
      { word: "EATEN", clue: "He ___ simply - locusts and honey", relevance: 80, source: 'local' },
      { word: "BORN", clue: "Miraculously ___ to elderly parents", relevance: 85, source: 'local' },
      { word: "PURE", clue: "Yahya was ___ and devout", relevance: 90, source: 'local' },
      { word: "NOBLE", clue: "A ___ prophet from birth", relevance: 85, source: 'local' },
      { word: "CHILD", clue: "Given wisdom as a ___", relevance: 90, source: 'local' },
    ],
  },

  ZAKARIYA: {
    displayName: "Prophet Zakariya (AS)",
    arabicName: "زكريا",
    keywords: [
      { word: "YAHYA", clue: "Son granted to Zakariya", relevance: 100 },
      { word: "JOHN", clue: "English name for Zakariya's son", relevance: 90 },
      { word: "FRUIT", clue: "Miraculous provision found in Maryam's sanctuary", relevance: 85 },
      // Friendly keywords (high letter scores)
      { word: "ALTAR", clue: "Where Zakariya prayed for a son", relevance: 90, source: 'local' },
      { word: "ROOM", clue: "Maryam's sanctuary he entered", relevance: 85, source: 'local' },
      { word: "SIGN", clue: "Made mute as a ___", relevance: 90, source: 'local' },
      { word: "HEIR", clue: "Zakariya prayed for an ___", relevance: 90, source: 'local' },
      { word: "OLD", clue: "Zakariya was ___ when he prayed for a son", relevance: 85, source: 'local' },
      { word: "THREE", clue: "___ days he could not speak", relevance: 85, source: 'local' },
      { word: "NIGHT", clue: "He called upon his Lord at ___", relevance: 80, source: 'local' },
      { word: "ALONE", clue: "He called his Lord in secret, ___", relevance: 80, source: 'local' },
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
      { word: "PALM", clue: "Maryam shook ___ tree for dates", relevance: 85, source: 'scraped' },
      { word: "DATE", clue: "Dates fell for Maryam from palm tree", relevance: 85, source: 'scraped' },
      { word: "CLAY", clue: "Isa made bird from ___", relevance: 90, source: 'scraped' },
      { word: "BIRD", clue: "___ bird Isa made came alive", relevance: 90, source: 'scraped' },
      { word: "DEAD", clue: "Isa raised the ___", relevance: 90, source: 'scraped' },
      { word: "HEAL", clue: "Isa could ___ the sick", relevance: 90, source: 'scraped' },
      { word: "BLIND", clue: "Isa cured the ___", relevance: 85, source: 'scraped' },
      { word: "CROSS", clue: "Isa was raised before crucifixion on the ___", relevance: 85, source: 'scraped' },
      { word: "MARYAM", clue: "Isa's blessed mother (Arabic)", relevance: 95, source: 'scraped' },
      { word: "ADAM", clue: "Isa created like ___ (without father)", relevance: 85, source: 'scraped' },
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
      { word: "AMIN", clue: "Prophet's title before revelation (The Trustworthy)", relevance: 90, source: 'scraped' },
      { word: "CAVE", clue: "Thawr - where Prophet hid during Hijra", relevance: 85, source: 'scraped' },
      { word: "TAIF", clue: "City where Prophet was rejected and stoned", relevance: 85, source: 'scraped' },
      { word: "AMINA", clue: "Prophet's mother", relevance: 85, source: 'scraped' },
      { word: "SIWAK", clue: "Prophet's oral hygiene practice", relevance: 80, source: 'puzzle-archive' },
      { word: "NABI", clue: "Arabic for 'prophet'", relevance: 85, source: 'puzzle-archive' },
      { word: "WAHY", clue: "Revelation received by the Prophet", relevance: 90, source: 'puzzle-archive' },
    ],
  },

  // ============ NEW PROPHETS FROM SCRAPING ============

  DHUL_KIFL: {
    displayName: "Prophet Dhul-Kifl (AS)",
    arabicName: "ذو الكفل",
    keywords: [
      { word: "KIFL", clue: "Part of Dhul-Kifl's name meaning 'fold'", relevance: 100, source: 'scraped' },
      { word: "FOLD", clue: "Meaning of 'Kifl' in Arabic", relevance: 90, source: 'scraped' },
      { word: "FAST", clue: "Dhul-Kifl fasted during the day", relevance: 85, source: 'scraped' },
      { word: "PRAY", clue: "Dhul-Kifl prayed throughout the night", relevance: 85, source: 'scraped' },
      { word: "NAP", clue: "He never napped during day prayers", relevance: 80, source: 'scraped' },
      { word: "CALM", clue: "He never lost his temper", relevance: 85, source: 'scraped' },
      { word: "SABR", clue: "Patience - he was among the patient ones", relevance: 90, source: 'scraped' },
      // Friendly keywords (high letter scores)
      { word: "REST", clue: "He never ___ from worship", relevance: 85, source: 'local' },
      { word: "RISE", clue: "Among those raised to high station", relevance: 85, source: 'local' },
      { word: "SENT", clue: "A ___ messenger of Allah", relevance: 80, source: 'local' },
      { word: "TRUE", clue: "He was ___ to his word", relevance: 90, source: 'local' },
      { word: "NIGHT", clue: "Spent the ___ in prayer", relevance: 85, source: 'local' },
      { word: "TRIAL", clue: "He faced every ___ with patience", relevance: 85, source: 'local' },
      { word: "TRUST", clue: "Known for his ___worthiness", relevance: 85, source: 'local' },
    ],
  },

  ILYAS: {
    displayName: "Prophet Ilyas (AS)",
    arabicName: "إلياس",
    keywords: [
      { word: "ILYAS", clue: "Prophet sent to those who worshipped Baal", relevance: 100, source: 'scraped' },
      { word: "BAAL", clue: "Idol worshipped by Ilyas's people", relevance: 95, source: 'scraped' },
      { word: "IDOL", clue: "False god Baal", relevance: 85, source: 'scraped' },
      { word: "AHAB", clue: "King during Ilyas's time", relevance: 85, source: 'scraped' },
      { word: "DRY", clue: "Drought during Ilyas's time", relevance: 80, source: 'scraped' },
      // Friendly keywords (high letter scores)
      { word: "RAIN", clue: "Ilyas prayed and ___ came", relevance: 95, source: 'local' },
      { word: "ALTAR", clue: "Where Ilyas called upon Allah", relevance: 90, source: 'local' },
      { word: "STONE", clue: "Built altar from twelve ___s", relevance: 85, source: 'local' },
      { word: "ALONE", clue: "Fled ___ to the wilderness", relevance: 85, source: 'local' },
      { word: "SENT", clue: "A ___ warner to his people", relevance: 85, source: 'local' },
      { word: "RISEN", clue: "Among those ___ to high station", relevance: 85, source: 'local' },
      { word: "EATEN", clue: "Fed by ravens, he ___", relevance: 80, source: 'local' },
    ],
  },

  AL_YASA: {
    displayName: "Prophet Al-Yasa (AS)",
    arabicName: "اليسع",
    keywords: [
      { word: "YASA", clue: "Part of Al-Yasa's name", relevance: 100, source: 'scraped' },
      { word: "ILYAS", clue: "Al-Yasa was successor to ___", relevance: 90, source: 'scraped' },
      { word: "RAIN", clue: "Al-Yasa ended the drought", relevance: 90, source: 'local' },
      { word: "LEPER", clue: "He cured ___ by Allah's will", relevance: 85, source: 'local' },
      { word: "HEAL", clue: "Al-Yasa healed the sick", relevance: 90, source: 'local' },
      { word: "DEAD", clue: "He raised the ___ by Allah's will", relevance: 85, source: 'local' },
      { word: "PURE", clue: "Among the chosen and excellent", relevance: 80, source: 'local' },
      { word: "BAAL", clue: "Idol his people worshipped", relevance: 85, source: 'local' },
      { word: "AHAB", clue: "Evil king during his time", relevance: 80, source: 'local' },
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
