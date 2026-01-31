import { Word, PlacedWord, Cell, Puzzle } from './types';

// Words parsed from provided word lists
// Format: WORD;SCORE;CLUE

// Prophet Stories words (high priority for puzzle themes)
const prophetStoriesWords: Word[] = [
  { id: 'ps-1', word: 'ADAM', clue: 'First vicegerent placed on earth', score: 100, category: 'prophets' },
  { id: 'ps-2', word: 'NUH', clue: 'Built the Ark', score: 100, category: 'prophets' },
  { id: 'ps-3', word: 'HUD', clue: 'Warner sent to the arrogant people of Ad', score: 100, category: 'prophets' },
  { id: 'ps-4', word: 'ISA', clue: 'The Prophet and messenger born without a father', score: 100, category: 'prophets' },
  { id: 'ps-5', word: 'MUSA', clue: 'Prophet who parted the sea', score: 100, category: 'prophets' },
  { id: 'ps-6', word: 'ARK', clue: 'The mighty vessel constructed under Nuh (AS)', score: 100, category: 'prophets' },
  { id: 'ps-7', word: 'AXE', clue: 'The sharp tool Ibrahim (AS) used to smash the false gods', score: 100, category: 'prophets' },
  { id: 'ps-8', word: 'CALF', clue: 'Golden animal worshipped by the Israelites in Musa\'s absence', score: 100, category: 'prophets' },
  { id: 'ps-9', word: 'CLAY', clue: 'The substance from which Allah molded the form of Adam (Q. 38:71)', score: 100, category: 'prophets' },
  { id: 'ps-10', word: 'CROW', clue: 'The bird which Allah sent to Qabil to demonstrate funeral rite (Q. 5:31)', score: 100, category: 'prophets' },
  { id: 'ps-11', word: 'FIRE', clue: 'The element that became "coolness and safety" for Ibrahim', score: 100, category: 'prophets' },
  { id: 'ps-12', word: 'FISH', clue: 'The Quran refers to Yunus (AS) as Dhan-Nun meaning, "Man of the _" (Q. 21:87)', score: 100, category: 'prophets' },
  { id: 'ps-13', word: 'IRON', clue: 'Specific metal that Allah miraculously made soft and flexible for Dawud (Q 34:11)', score: 100, category: 'prophets' },
  { id: 'ps-14', word: 'JUDI', clue: 'The mountain where Nuh\'s Ark finally came to rest after the waters subsided', score: 100, category: 'prophets' },
  { id: 'ps-15', word: 'NILE', clue: 'The river into which the infant Musa was cast in a basket', score: 100, category: 'prophets' },
  { id: 'ps-16', word: 'WELL', clue: 'The desolate place where Yusuf was cast by his brothers', score: 100, category: 'prophets' },
  { id: 'ps-17', word: 'WIND', clue: 'The violent element that raged for eight days that destroyed Ad (Q. 69:6)', score: 100, category: 'prophets' },
  { id: 'ps-18', word: 'AARON', clue: 'English equivalent to Prophet Harun (AS)', score: 100, category: 'prophets' },
  { id: 'ps-19', word: 'AYYUB', clue: 'The Prophet who lost fourteen children', score: 100, category: 'prophets' },
  { id: 'ps-20', word: 'DAWUD', clue: 'The Prophet who fought Goliath and killed him', score: 100, category: 'prophets' },
  { id: 'ps-21', word: 'HARUN', clue: 'Elder brother of Prophet Musa', score: 100, category: 'prophets' },
  { id: 'ps-22', word: 'HAWWA', clue: 'Earliest matriarch', score: 100, category: 'prophets' },
  { id: 'ps-23', word: 'IBLIS', clue: 'Satan in Islam', score: 100, category: 'prophets' },
  { id: 'ps-24', word: 'IDRIS', clue: 'The first man who learned how to write', score: 100, category: 'prophets' },
  { id: 'ps-25', word: 'ILYAS', clue: 'The Prophet sent to people who worshipped the idol Baal', score: 100, category: 'prophets' },
  { id: 'ps-26', word: 'INJIL', clue: 'The book of Isa', score: 100, category: 'prophets' },
  { id: 'ps-27', word: 'ISHAQ', clue: 'The son born to Sarah after she received glad tidings from three angels', score: 100, category: 'prophets' },
  { id: 'ps-28', word: 'JALUT', clue: 'Giant killed by Dawud (AS)', score: 100, category: 'prophets' },
  { id: 'ps-29', word: 'KHIDR', clue: 'The name of the wise man Prophet Musa meets (Al-_)', score: 100, category: 'prophets' },
  { id: 'ps-30', word: 'MANNA', clue: 'Miraculous food provided to the wandering Israelites in the wilderness', score: 100, category: 'prophets' },
  { id: 'ps-31', word: 'QABIL', clue: 'Elder twin who committed the first criminal act on earth', score: 100, category: 'prophets' },
  { id: 'ps-32', word: 'SALIH', clue: 'Prophet sent to guide the people of Thamud', score: 100, category: 'prophets' },
  { id: 'ps-33', word: 'SARAH', clue: 'Prophet Ibrahim\'s wife who accompanied him during his migration', score: 100, category: 'prophets' },
  { id: 'ps-34', word: 'STAFF', clue: 'The object held by Musa that miraculously transformed into a wriggling serpent', score: 100, category: 'prophets' },
  { id: 'ps-35', word: 'TORAH', clue: 'English equivalent to scripture given to Musa', score: 100, category: 'prophets' },
  { id: 'ps-36', word: 'WHALE', clue: 'The sea creature that served as a "prison" for Yunus in three layers of darkness', score: 100, category: 'prophets' },
  { id: 'ps-37', word: 'YAHYA', clue: 'Son of Zakariya', score: 100, category: 'prophets' },
  { id: 'ps-38', word: 'YAQUB', clue: 'The famous father of twelve sons', score: 100, category: 'prophets' },
  { id: 'ps-39', word: 'YUNUS', clue: 'The Arabic name of the Prophet Jonah', score: 100, category: 'prophets' },
  { id: 'ps-40', word: 'YUSUF', clue: 'Man who was given half the world\'s beauty', score: 100, category: 'prophets' },
  { id: 'ps-41', word: 'ZABUR', clue: 'The scripture that was revealed to Prophet Dawud', score: 100, category: 'prophets' },
  { id: 'ps-42', word: 'HAGAR', clue: 'The mother of Ismail', score: 100, category: 'prophets' },
  { id: 'ps-43', word: 'HABIL', clue: 'The intelligent and obedient son who offered his best camel as sacrifice', score: 100, category: 'prophets' },
  { id: 'ps-44', word: 'BILQIS', clue: 'Royal who mistook a glass floor for a pool of water', score: 100, category: 'prophets' },
  { id: 'ps-45', word: 'MARYAM', clue: 'The only woman mentioned in the Quran by her name', score: 100, category: 'prophets' },
  { id: 'ps-46', word: 'HOOPOE', clue: 'The bird that acted as a messenger for Prophet Sulaiman', score: 100, category: 'prophets' },
  { id: 'ps-47', word: 'ISMAIL', clue: 'The first-born son whose birth was a gift to Ibrahim in his old age', score: 100, category: 'prophets' },
  { id: 'ps-48', word: 'ZAMZAM', clue: 'Sacred H2O source', score: 100, category: 'prophets' },
  { id: 'ps-49', word: 'IBRAHIM', clue: 'The name of the Patriarch (father) of the Prophets', score: 100, category: 'prophets' },
  { id: 'ps-50', word: 'JIBREEL', clue: 'The angel Gabriel in Islam', score: 100, category: 'prophets' },
  { id: 'ps-51', word: 'SULAIMAN', clue: 'Prophet who was taught the language of birds', score: 100, category: 'prophets' },
  { id: 'ps-52', word: 'ZAKARIYA', clue: 'Prophet and guardian of Maryam (RA)', score: 100, category: 'prophets' },
  { id: 'ps-53', word: 'MUHAMMAD', clue: 'The final Prophet', score: 100, category: 'prophets' },
  { id: 'ps-54', word: 'BURAQ', clue: 'Used for the night journey to Jerusalem', score: 100, category: 'prophets' },
  { id: 'ps-55', word: 'DREAM', clue: 'Pharaoh had one, Yusuf interpreted one', score: 100, category: 'prophets' },
  { id: 'ps-56', word: 'EGYPT', clue: 'Country where Yusuf rose to power', score: 100, category: 'prophets' },
];

// General Islamic words
const islamicWords: Word[] = [
  { id: 'iw-1', word: 'ALLAH', clue: 'The most mentioned name of God in Quran', score: 100, category: 'general' },
  { id: 'iw-2', word: 'QURAN', clue: 'Muslim Holy Book', score: 100, category: 'quran' },
  { id: 'iw-3', word: 'SALAH', clue: 'Fajr, Dhuhr, Asr, Maghrib, Isha', score: 100, category: 'general' },
  { id: 'iw-4', word: 'HAJJ', clue: 'Pilgrimage to Mecca', score: 100, category: 'general' },
  { id: 'iw-5', word: 'DUA', clue: 'Invocation or supplication in Islam', score: 100, category: 'general' },
  { id: 'iw-6', word: 'EID', clue: 'Celebration tied to the new moon', score: 100, category: 'general' },
  { id: 'iw-7', word: 'FAJR', clue: 'Dawn prayer', score: 100, category: 'general' },
  { id: 'iw-8', word: 'IQRA', clue: 'The first word revealed', score: 100, category: 'quran' },
  { id: 'iw-9', word: 'HIRA', clue: 'The cave where it all began', score: 100, category: 'general' },
  { id: 'iw-10', word: 'KAABA', clue: 'Cubic building at the center of Islam\'s holiest mosque', score: 100, category: 'general' },
  { id: 'iw-11', word: 'HIJRA', clue: 'Journey from Mecca to Medina', score: 100, category: 'general' },
  { id: 'iw-12', word: 'DHIKR', clue: 'Remembrance of God', score: 100, category: 'general' },
  { id: 'iw-13', word: 'IMAM', clue: 'One who leads the prayer', score: 100, category: 'general' },
  { id: 'iw-14', word: 'MECCA', clue: 'Birthplace of Prophet Muhammad (SAW)', score: 100, category: 'general' },
  { id: 'iw-15', word: 'ISLAM', clue: 'Fastest growing religion globally', score: 100, category: 'general' },
  { id: 'iw-16', word: 'SAWM', clue: 'Fasting', score: 100, category: 'general' },
  { id: 'iw-17', word: 'TAWAF', clue: 'Circumambulation around the Kaaba', score: 100, category: 'general' },
  { id: 'iw-18', word: 'WUDU', clue: 'Ablution before prayer', score: 100, category: 'general' },
  { id: 'iw-19', word: 'HALAL', clue: 'Permissible in Islamic law', score: 100, category: 'general' },
  { id: 'iw-20', word: 'HARAM', clue: 'Forbidden, unlawful', score: 100, category: 'general' },
  { id: 'iw-21', word: 'SUNNI', clue: 'The largest branch of Islam', score: 100, category: 'general' },
  { id: 'iw-22', word: 'SURAH', clue: 'Chapter of Quran', score: 100, category: 'quran' },
  { id: 'iw-23', word: 'JIHAD', clue: 'Striving or holy war', score: 100, category: 'general' },
  { id: 'iw-24', word: 'TAQWA', clue: 'God consciousness', score: 100, category: 'general' },
  { id: 'iw-25', word: 'UMMAH', clue: 'Muslim community', score: 100, category: 'general' },
  { id: 'iw-26', word: 'UMRAH', clue: 'Lesser pilgrimage', score: 100, category: 'general' },
  { id: 'iw-27', word: 'FATWA', clue: 'Arabic for legal opinion given by religious scholar', score: 100, category: 'general' },
  { id: 'iw-28', word: 'HAFIZ', clue: 'A person who memorized the quran', score: 100, category: 'quran' },
  { id: 'iw-29', word: 'GHUSL', clue: 'Required cleanliness in the case of a major ritual impurity', score: 100, category: 'general' },
  { id: 'iw-30', word: 'IHRAM', clue: 'White garment worn by pilgrim during Hajj', score: 100, category: 'general' },
  { id: 'iw-31', word: 'IHSAN', clue: 'Going above and beyond in goodness', score: 100, category: 'general' },
  { id: 'iw-32', word: 'MIRAJ', clue: 'Night journey to the heavens', score: 100, category: 'general' },
  { id: 'iw-33', word: 'QIBLAH', clue: 'Direction a muslim should face while praying', score: 100, category: 'general' },
  { id: 'iw-34', word: 'SHIRK', clue: 'Taking partners or association with God', score: 100, category: 'general' },
  { id: 'iw-35', word: 'TAWHID', clue: 'Belief in the oneness of God, monotheism', score: 100, category: 'general' },
  { id: 'iw-36', word: 'DAWAH', clue: 'Calling people to Islam', score: 100, category: 'general' },
  { id: 'iw-37', word: 'DHUHR', clue: 'Noon prayer', score: 100, category: 'general' },
  { id: 'iw-38', word: 'MASJID', clue: 'House of worship', score: 100, category: 'general' },
  { id: 'iw-39', word: 'MINBAR', clue: 'A pulpit where sermons are delivered in the mosque', score: 100, category: 'general' },
  { id: 'iw-40', word: 'MIHRAB', clue: 'The Niche at the front', score: 100, category: 'general' },
  { id: 'iw-41', word: 'MUEZZIN', clue: 'Calls others to prayer', score: 100, category: 'general' },
  { id: 'iw-42', word: 'TAFSIR', clue: 'Exegesis or commentary on the Quran', score: 100, category: 'quran' },
  { id: 'iw-43', word: 'HADITH', clue: 'Narratives of Muhammad (SAW)', score: 100, category: 'general' },
  { id: 'iw-44', word: 'SUNNAH', clue: 'Steps of Prophet Muhammad (SAW)', score: 100, category: 'general' },
  { id: 'iw-45', word: 'SHARIA', clue: 'Islamic law', score: 100, category: 'general' },
  { id: 'iw-46', word: 'ADHAN', clue: 'Said in a baby\'s ear, sunnah', score: 100, category: 'general' },
  { id: 'iw-47', word: 'SABR', clue: 'Patience', score: 100, category: 'general' },
  { id: 'iw-48', word: 'NAFL', clue: 'Optional but praiseworthy', score: 100, category: 'general' },
  { id: 'iw-49', word: 'ISHA', clue: 'Night prayer', score: 100, category: 'general' },
  { id: 'iw-50', word: 'ASR', clue: 'Afternoon prayer', score: 100, category: 'general' },
  { id: 'iw-51', word: 'MAGHRIB', clue: 'Sunset prayer', score: 100, category: 'general' },
  { id: 'iw-52', word: 'JINN', clue: 'Creatures who are created from a smokeless flame of fire', score: 100, category: 'general' },
  { id: 'iw-53', word: 'JAHANNAM', clue: 'Islamic concept of hell', score: 100, category: 'general' },
  { id: 'iw-54', word: 'FIRDAWS', clue: 'Special place in Jannah', score: 100, category: 'general' },
  { id: 'iw-55', word: 'KHADIJA', clue: 'The wife of Prophet Muhammad (SAW) known as the "mother of believers"', score: 100, category: 'companions' },
  { id: 'iw-56', word: 'ABUBAKR', clue: 'First Caliph', score: 100, category: 'companions' },
  { id: 'iw-57', word: 'ALI', clue: 'The fourth Caliph', score: 100, category: 'companions' },
  { id: 'iw-58', word: 'BADR', clue: 'The valley where a small Muslim force defeated a larger Meccan army', score: 100, category: 'general' },
  { id: 'iw-59', word: 'UHUD', clue: 'The hill north of Medina where a significant battle took place', score: 100, category: 'general' },
  { id: 'iw-60', word: 'ANSAR', clue: 'The "Helpers" of Medina who assisted and welcomed the Emigrants', score: 100, category: 'companions' },
  { id: 'iw-61', word: 'QURAYSH', clue: 'The guardians of the Kaaba', score: 100, category: 'general' },
];

// Names of Allah
const namesOfAllah: Word[] = [
  { id: 'na-1', word: 'RAHMAN', clue: 'The Most Merciful', score: 100, category: 'names-of-allah' },
  { id: 'na-2', word: 'RAHIM', clue: 'The Most Compassionate', score: 100, category: 'names-of-allah' },
  { id: 'na-3', word: 'MALIK', clue: 'The King, The Sovereign', score: 100, category: 'names-of-allah' },
  { id: 'na-4', word: 'QUDDUS', clue: 'The Holy One', score: 100, category: 'names-of-allah' },
  { id: 'na-5', word: 'SALAM', clue: 'The Source of Peace', score: 100, category: 'names-of-allah' },
  { id: 'na-6', word: 'AZIZ', clue: 'The Almighty', score: 100, category: 'names-of-allah' },
  { id: 'na-7', word: 'JABBAR', clue: 'The Compeller', score: 100, category: 'names-of-allah' },
  { id: 'na-8', word: 'KHALIQ', clue: 'The Creator', score: 100, category: 'names-of-allah' },
  { id: 'na-9', word: 'GHAFUR', clue: 'The All-Forgiving', score: 100, category: 'names-of-allah' },
  { id: 'na-10', word: 'WAHAB', clue: 'The Bestower', score: 100, category: 'names-of-allah' },
  { id: 'na-11', word: 'RAZZAQ', clue: 'The Provider', score: 100, category: 'names-of-allah' },
  { id: 'na-12', word: 'ALIM', clue: 'The All-Knowing', score: 100, category: 'names-of-allah' },
  { id: 'na-13', word: 'SAMI', clue: 'The All-Hearing', score: 100, category: 'names-of-allah' },
  { id: 'na-14', word: 'BASIR', clue: 'The All-Seeing', score: 100, category: 'names-of-allah' },
  { id: 'na-15', word: 'HAKIM', clue: 'The Wise', score: 100, category: 'names-of-allah' },
  { id: 'na-16', word: 'WADUD', clue: 'The Loving One', score: 100, category: 'names-of-allah' },
  { id: 'na-17', word: 'MAJID', clue: 'The Glorious', score: 100, category: 'names-of-allah' },
  { id: 'na-18', word: 'HAQQ', clue: 'The Truth', score: 100, category: 'names-of-allah' },
  { id: 'na-19', word: 'WAKIL', clue: 'The Trustee', score: 100, category: 'names-of-allah' },
  { id: 'na-20', word: 'QADIR', clue: 'The Capable', score: 100, category: 'names-of-allah' },
];

// Combine all words
export const sampleWords: Word[] = [...prophetStoriesWords, ...islamicWords, ...namesOfAllah];

// Generate a sample puzzle grid
export function generateSamplePuzzle(): Puzzle {
  const rows = 10;
  const cols = 10;

  const grid: Cell[][] = Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({
      letter: null,
      number: null,
      isBlack: false,
      wordIds: [],
    }))
  );

  // Place some words
  const adamLetters = 'ADAM'.split('');
  adamLetters.forEach((letter, i) => {
    grid[1][2 + i] = { letter, number: i === 0 ? 1 : null, isBlack: false, wordIds: ['ps-1'] };
  });

  const allahLetters = 'ALLAH'.split('');
  allahLetters.forEach((letter, i) => {
    const cell = grid[1 + i][4];
    cell.letter = letter;
    cell.number = i === 0 ? 2 : cell.number;
    cell.wordIds.push('iw-1');
  });

  const musaLetters = 'MUSA'.split('');
  musaLetters.forEach((letter, i) => {
    const cell = grid[3][3 + i];
    if (!cell.letter) cell.letter = letter;
    cell.number = i === 0 ? 3 : cell.number;
    cell.wordIds.push('ps-5');
  });

  const quranLetters = 'QURAN'.split('');
  quranLetters.forEach((letter, i) => {
    const cell = grid[5][2 + i];
    cell.letter = letter;
    cell.number = i === 0 ? 4 : cell.number;
    cell.wordIds.push('iw-2');
  });

  const placedWords: PlacedWord[] = [
    { word: sampleWords.find(w => w.id === 'ps-1')!, row: 1, col: 2, direction: 'across', number: 1 },
    { word: sampleWords.find(w => w.id === 'iw-1')!, row: 1, col: 4, direction: 'down', number: 2 },
    { word: sampleWords.find(w => w.id === 'ps-5')!, row: 3, col: 3, direction: 'across', number: 3 },
    { word: sampleWords.find(w => w.id === 'iw-2')!, row: 5, col: 2, direction: 'across', number: 4 },
  ];

  return {
    id: 'sample-1',
    title: 'Islamic Crossword #1',
    author: 'myislam.org',
    createdAt: new Date(),
    grid,
    placedWords,
    rows,
    cols,
  };
}

export const aiClueSuggestions = [
  {
    text: 'Father of Yahya (John the Baptist)',
    type: 'Quranic reference',
  },
  {
    text: 'Prophet who was given glad tidings of a son in old age',
    type: 'Story-based',
  },
  {
    text: 'He prayed for an heir while standing in the mihrab',
    type: 'Detailed reference (Q. 3:39)',
  },
  {
    text: '_____ (AS), guardian of Maryam',
    type: 'Fill-in-the-blank',
  },
];
