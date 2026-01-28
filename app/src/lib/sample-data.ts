import { Word, PlacedWord, Cell, Puzzle } from './types';

export const sampleWords: Word[] = [
  {
    id: '1',
    word: 'QURAN',
    clue: 'Muslim Holy Book',
    score: 100,
    arabicScript: 'القرآن',
    spellingVariants: ['QURAN', 'KORAN', 'QORAN'],
    category: 'quran',
  },
  {
    id: '2',
    word: 'SALAH',
    clue: 'Fajr, Dhuhr, Asr, Maghrib, Isha',
    score: 100,
    arabicScript: 'صلاة',
    spellingVariants: ['SALAH', 'SALAT', 'SALAAH'],
    category: 'general',
  },
  {
    id: '3',
    word: 'HAJJ',
    clue: 'Pilgrimage to Mecca',
    score: 100,
    arabicScript: 'حج',
    spellingVariants: ['HAJJ', 'HAJ'],
    category: 'general',
  },
  {
    id: '4',
    word: 'RAMADAN',
    clue: 'Holy month of fasting',
    score: 100,
    arabicScript: 'رمضان',
    spellingVariants: ['RAMADAN', 'RAMADHAN', 'RAMAZAN'],
    category: 'general',
  },
  {
    id: '5',
    word: 'MUSA',
    clue: 'Prophet who parted the sea',
    score: 100,
    arabicScript: 'موسى',
    spellingVariants: ['MUSA', 'MOSES', 'MOUSA'],
    category: 'prophets',
  },
  {
    id: '6',
    word: 'IBRAHIM',
    clue: 'Father of prophets',
    score: 100,
    arabicScript: 'إبراهيم',
    spellingVariants: ['IBRAHIM', 'ABRAHAM', 'IBRAHEEM'],
    category: 'prophets',
  },
  {
    id: '7',
    word: 'ZAKAH',
    clue: 'Obligatory charity, one of the five pillars',
    score: 100,
    arabicScript: 'زكاة',
    spellingVariants: ['ZAKAH', 'ZAKAT', 'ZAKAAH'],
    category: 'general',
  },
  {
    id: '8',
    word: 'ZAKARIYA',
    clue: 'Prophet and guardian of Maryam (RA)',
    score: 100,
    arabicScript: 'زكريا',
    spellingVariants: ['ZAKARIYA', 'ZAKARIYYA', 'ZECHARIAH', 'ZACHARIAS'],
    category: 'prophets',
  },
  {
    id: '9',
    word: 'ALLAH',
    clue: 'The most mentioned name of God in Quran',
    score: 100,
    arabicScript: 'الله',
    category: 'names-of-allah',
  },
  {
    id: '10',
    word: 'ISA',
    clue: 'Prophet and messenger born without a father',
    score: 100,
    arabicScript: 'عيسى',
    spellingVariants: ['ISA', 'EESA', 'JESUS'],
    category: 'prophets',
  },
  {
    id: '11',
    word: 'KAABA',
    clue: 'Cubic building at the center of Islam\'s holiest mosque',
    score: 100,
    arabicScript: 'الكعبة',
    spellingVariants: ['KAABA', 'KABAH', 'KAABAH'],
    category: 'general',
  },
  {
    id: '12',
    word: 'IMAM',
    clue: 'One who leads the prayer',
    score: 100,
    arabicScript: 'إمام',
    category: 'general',
  },
  {
    id: '13',
    word: 'FAJR',
    clue: 'Dawn prayer',
    score: 100,
    arabicScript: 'فجر',
    category: 'general',
  },
  {
    id: '14',
    word: 'DHIKR',
    clue: 'Remembrance of God',
    score: 100,
    arabicScript: 'ذكر',
    spellingVariants: ['DHIKR', 'ZIKR', 'THIKR'],
    category: 'general',
  },
  {
    id: '15',
    word: 'RAHMAN',
    clue: 'The Most Merciful - one of the 99 names',
    score: 100,
    arabicScript: 'الرحمن',
    spellingVariants: ['RAHMAN', 'AR-RAHMAN'],
    category: 'names-of-allah',
  },
];

// Generate a sample puzzle grid
export function generateSamplePuzzle(): Puzzle {
  // 10x10 grid with some words placed
  const rows = 10;
  const cols = 10;

  // Initialize empty grid
  const grid: Cell[][] = Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({
      letter: null,
      number: null,
      isBlack: false,
      wordIds: [],
    }))
  );

  // Place some words
  // QURAN down at (1, 4)
  const quranLetters = 'QURAN'.split('');
  quranLetters.forEach((letter, i) => {
    grid[1 + i][4] = { letter, number: i === 0 ? 1 : null, isBlack: false, wordIds: ['1'] };
  });

  // HAJJ across at (3, 1)
  const hajjLetters = 'HAJJ'.split('');
  hajjLetters.forEach((letter, i) => {
    const cell = grid[3][1 + i];
    cell.letter = letter;
    cell.number = i === 0 ? 2 : cell.number;
    cell.wordIds.push('3');
  });

  // MUSA across at (5, 4)
  const musaLetters = 'MUSA'.split('');
  musaLetters.forEach((letter, i) => {
    const cell = grid[5][4 + i];
    cell.letter = letter;
    cell.number = i === 0 ? 3 : cell.number;
    cell.wordIds.push('5');
  });

  // ALLAH down at (3, 2)
  const allahLetters = 'ALLAH'.split('');
  allahLetters.forEach((letter, i) => {
    const cell = grid[3 + i][2];
    if (!cell.letter) {
      cell.letter = letter;
    }
    cell.number = i === 0 ? 4 : cell.number;
    cell.wordIds.push('9');
  });

  const placedWords: PlacedWord[] = [
    { word: sampleWords[0], row: 1, col: 4, direction: 'down', number: 1 },
    { word: sampleWords[2], row: 3, col: 1, direction: 'across', number: 2 },
    { word: sampleWords[4], row: 5, col: 4, direction: 'across', number: 3 },
    { word: sampleWords[8], row: 3, col: 2, direction: 'down', number: 4 },
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
