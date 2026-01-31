/**
 * 5x5 Grid Generator for Islamic Crossword Puzzles
 *
 * Ported from Python Grid5x5Generator (src/generator.py)
 *
 * Features:
 * - 8 black square patterns with symmetry
 * - Seed word placement in row 0
 * - Intersection-based word placement
 * - Grid scoring (words placed, intersections, fill density)
 */

import { v } from "convex/values";
import { action } from "./_generated/server";

// Direction enum
type Direction = "ACROSS" | "DOWN";

// Cell in the grid
interface Cell {
  letter: string | null;
  isBlack: boolean;
  number: number | null;
}

// Placed word data
interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  number: number;
}

// Word input from client
interface WordInput {
  id: string;
  word: string;
  clue: string;
  activeSpelling: string;
}

// Grid generation result
interface GenerationResult {
  success: boolean;
  grid: {
    type: "empty" | "black" | "letter";
    solution?: string;
    number?: number;
  }[][];
  placedWords: PlacedWord[];
  placedWordIds: string[];
  unplacedWordIds: string[];
  clues: {
    across: {
      number: number;
      clue: string;
      answer: string;
      row: number;
      col: number;
      length: number;
    }[];
    down: {
      number: number;
      clue: string;
      answer: string;
      row: number;
      col: number;
      length: number;
    }[];
  };
  statistics: {
    gridFillPercentage: number;
    wordPlacementRate: number;
    totalIntersections: number;
    avgIntersectionsPerWord: number;
    gridConnectivity: number;
    totalCells: number;
    filledCells: number;
    placedWordCount: number;
    totalWordCount: number;
  };
  score: number;
}

// Common 5x5 black square patterns (row, col positions)
// These get mirrored for symmetry
const BLACK_PATTERNS: [number, number][][] = [
  // Pattern 0: Single corner
  [[0, 4]],
  // Pattern 1: Two corners (diagonal)
  [[0, 4], [4, 0]],
  // Pattern 2: L-shape corner
  [[0, 4], [1, 4]],
  // Pattern 3: Cross center
  [[2, 2]],
  // Pattern 4: No black squares (dense)
  [],
  // Pattern 5: Staircase
  [[0, 4], [1, 3]],
  // Pattern 6: Two edges
  [[2, 4], [2, 0]],
  // Pattern 7: Three corners
  [[0, 4], [4, 0], [4, 4]],
];

/**
 * Create an empty 5x5 grid
 */
function createEmptyGrid(): Cell[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => ({ letter: null, isBlack: false, number: null }))
  );
}

/**
 * Apply black square pattern with symmetry
 */
function applyBlackPattern(grid: Cell[][], pattern: [number, number][]): void {
  for (const [row, col] of pattern) {
    if (row >= 0 && row < 5 && col >= 0 && col < 5) {
      grid[row][col].isBlack = true;
    }
    // Apply point symmetry (180-degree rotation)
    const symRow = 4 - row;
    const symCol = 4 - col;
    if (symRow >= 0 && symRow < 5 && symCol >= 0 && symCol < 5) {
      grid[symRow][symCol].isBlack = true;
    }
  }
}

/**
 * Check if a word fits at a position
 */
function canPlaceWord(
  grid: Cell[][],
  word: string,
  row: number,
  col: number,
  direction: Direction
): boolean {
  const len = word.length;

  // Check bounds
  if (direction === "ACROSS") {
    if (col < 0 || col + len > 5 || row < 0 || row >= 5) return false;
  } else {
    if (row < 0 || row + len > 5 || col < 0 || col >= 5) return false;
  }

  // Check each cell
  for (let i = 0; i < len; i++) {
    const r = direction === "ACROSS" ? row : row + i;
    const c = direction === "ACROSS" ? col + i : col;

    const cell = grid[r][c];

    // Can't place on black cell
    if (cell.isBlack) return false;

    // Cell must be empty or have matching letter
    if (cell.letter !== null && cell.letter !== word[i]) return false;
  }

  // Check for adjacent parallel words (no two-letter words)
  // This is a simplified check - full validation would be more complex
  return true;
}

// Common words for arc consistency checking (subset for Convex - keeps action lightweight)
// This is a simplified word set; the full validation happens client-side
const COMMON_2_5_WORDS = new Set([
  // 2-letter
  'AM', 'AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE',
  // 3-letter common
  'ACE', 'ACT', 'ADD', 'AGE', 'AGO', 'AID', 'AIM', 'AIR', 'ALL', 'AND', 'ANT', 'ANY', 'APE', 'ARC', 'ARE', 'ARK', 'ARM', 'ART', 'ASH', 'ATE', 'AWE',
  'BAD', 'BAG', 'BAR', 'BAT', 'BAY', 'BED', 'BEE', 'BET', 'BIG', 'BIT', 'BOW', 'BOX', 'BOY', 'BUD', 'BUG', 'BUS', 'BUT', 'BUY', 'CAB', 'CAN', 'CAP', 'CAR', 'CAT',
  'DAD', 'DAM', 'DAY', 'DEN', 'DEW', 'DID', 'DIE', 'DIG', 'DIM', 'DIP', 'DOC', 'DOE', 'DOG', 'DOT', 'DRY', 'DUA', 'DUB', 'DUD', 'DUE', 'DUG', 'DYE',
  'EAR', 'EAT', 'EEL', 'EGG', 'EID', 'ELF', 'ELK', 'ELM', 'EMU', 'END', 'ERA', 'ERR', 'EVE', 'EWE', 'EYE',
  'FAN', 'FAR', 'FAT', 'FAX', 'FED', 'FEE', 'FEW', 'FIG', 'FIN', 'FIT', 'FIX', 'FLY', 'FOB', 'FOE', 'FOG', 'FOR', 'FOX', 'FRY', 'FUN', 'FUR',
  'GAB', 'GAG', 'GAP', 'GAS', 'GAY', 'GEL', 'GEM', 'GET', 'GIG', 'GIN', 'GNU', 'GOB', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY', 'GYM',
  'HAD', 'HAM', 'HAS', 'HAT', 'HAY', 'HEM', 'HEN', 'HER', 'HEW', 'HEX', 'HID', 'HIM', 'HIP', 'HIS', 'HIT', 'HOB', 'HOD', 'HOG', 'HOP', 'HOT', 'HOW', 'HUB', 'HUE', 'HUG', 'HUM', 'HUT',
  'ICE', 'ICY', 'ILL', 'IMP', 'INK', 'INN', 'ION', 'IRE', 'IRK', 'ISA', 'ITS', 'IVY',
  'JAB', 'JAG', 'JAM', 'JAR', 'JAW', 'JAY', 'JET', 'JIG', 'JOB', 'JOG', 'JOT', 'JOY', 'JUG', 'JUT',
  'KEG', 'KEN', 'KEY', 'KID', 'KIN', 'KIT',
  'LAB', 'LAC', 'LAD', 'LAG', 'LAP', 'LAW', 'LAY', 'LEA', 'LED', 'LEG', 'LET', 'LID', 'LIE', 'LIP', 'LIT', 'LOG', 'LOT', 'LOW', 'LUG',
  'MAD', 'MAN', 'MAP', 'MAR', 'MAT', 'MAW', 'MAX', 'MAY', 'MEN', 'MET', 'MID', 'MIX', 'MOB', 'MOD', 'MOM', 'MOP', 'MOW', 'MUD', 'MUG', 'MUM',
  'NAB', 'NAG', 'NAP', 'NAY', 'NET', 'NEW', 'NIL', 'NIP', 'NIT', 'NOB', 'NOD', 'NOR', 'NOT', 'NOW', 'NUB', 'NUH', 'NUN', 'NUT',
  'OAK', 'OAR', 'OAT', 'ODD', 'ODE', 'OFF', 'OFT', 'OHM', 'OIL', 'OLD', 'ONE', 'OPT', 'ORB', 'ORE', 'OUR', 'OUT', 'OWE', 'OWL', 'OWN',
  'PAD', 'PAL', 'PAN', 'PAP', 'PAR', 'PAT', 'PAW', 'PAY', 'PEA', 'PEG', 'PEN', 'PEP', 'PER', 'PET', 'PEW', 'PIE', 'PIG', 'PIN', 'PIT', 'PLY', 'POD', 'POP', 'POT', 'POW', 'PRY', 'PUB', 'PUN', 'PUP', 'PUS', 'PUT',
  'RAD', 'RAG', 'RAM', 'RAN', 'RAP', 'RAT', 'RAW', 'RAY', 'RED', 'REF', 'RIB', 'RID', 'RIG', 'RIM', 'RIP', 'ROB', 'ROD', 'ROE', 'ROT', 'ROW', 'RUB', 'RUG', 'RUM', 'RUN', 'RUT', 'RYE',
  'SAC', 'SAD', 'SAG', 'SAP', 'SAT', 'SAW', 'SAY', 'SEA', 'SET', 'SEW', 'SHE', 'SHY', 'SIN', 'SIP', 'SIR', 'SIS', 'SIT', 'SIX', 'SKI', 'SKY', 'SLY', 'SOB', 'SOD', 'SON', 'SOP', 'SOT', 'SOW', 'SOY', 'SPA', 'SPY', 'STY', 'SUB', 'SUM', 'SUN', 'SUP',
  'TAB', 'TAD', 'TAG', 'TAN', 'TAP', 'TAR', 'TAT', 'TAX', 'TEA', 'TEN', 'THE', 'THY', 'TIC', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOO', 'TOP', 'TOT', 'TOW', 'TOY', 'TRY', 'TUB', 'TUG', 'TWO',
  'URN', 'USE',
  'VAN', 'VAT', 'VET', 'VIA', 'VIE', 'VOW',
  'WAD', 'WAG', 'WAR', 'WAS', 'WAX', 'WAY', 'WEB', 'WED', 'WEE', 'WET', 'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WOE', 'WOK', 'WON', 'WOO', 'WOW',
  'YAK', 'YAM', 'YAP', 'YAW', 'YEA', 'YES', 'YET', 'YEW', 'YIN', 'YIP', 'YOU',
  'ZAP', 'ZED', 'ZEN', 'ZIP', 'ZIT', 'ZOO',
  // 4-letter common + Islamic
  'ABLE', 'ACHE', 'ACID', 'ACRE', 'ADAM', 'AGED', 'AIDE', 'ALLY', 'ALSO', 'ALTO', 'ANTI', 'ARCH', 'AREA', 'ARIA', 'ARMY', 'ARTS', 'AUNT', 'AUTO', 'AWAY',
  'BABY', 'BACK', 'BAIL', 'BAIT', 'BAKE', 'BALD', 'BALE', 'BALL', 'BAND', 'BANE', 'BANG', 'BANK', 'BARE', 'BARK', 'BARN', 'BASE', 'BATH', 'BEAD', 'BEAK', 'BEAM', 'BEAN', 'BEAR', 'BEAT', 'BEEN', 'BEER', 'BELL', 'BELT', 'BEND', 'BENT', 'BEST', 'BIKE', 'BILE', 'BILL', 'BIND', 'BIRD', 'BITE', 'BLOW', 'BLUE', 'BLUR', 'BOAR', 'BOAT', 'BODY', 'BOIL', 'BOLD', 'BOLT', 'BOMB', 'BOND', 'BONE', 'BOOK', 'BOOM', 'BOOT', 'BORE', 'BORN', 'BOSS', 'BOTH', 'BOUT', 'BOWL',
  'CAFE', 'CAGE', 'CAKE', 'CALF', 'CALL', 'CALM', 'CAME', 'CAMP', 'CANE', 'CAPE', 'CARD', 'CARE', 'CARP', 'CART', 'CASE', 'CASH', 'CAST', 'CAVE', 'CELL', 'CHAT', 'CHEF', 'CHEW', 'CHIN', 'CHIP', 'CHOP', 'CITE', 'CITY', 'CLAM', 'CLAP', 'CLAW', 'CLAY', 'CLIP', 'CLUB', 'CLUE', 'COAL', 'COAT', 'COCK', 'CODE', 'COIL', 'COIN', 'COLD', 'COLT', 'COMB', 'COME', 'CONE', 'COOK', 'COOL', 'COPE', 'COPY', 'CORD', 'CORE', 'CORK', 'CORN', 'COST', 'COUP', 'COVE', 'CRAB', 'CRAM', 'CREW', 'CRIB', 'CROP', 'CROW', 'CULT', 'CURB', 'CURE', 'CURL', 'CUTE',
  'DALE', 'DAME', 'DAMP', 'DARE', 'DARK', 'DARN', 'DART', 'DASH', 'DATA', 'DATE', 'DAWN', 'DAYS', 'DEAD', 'DEAF', 'DEAL', 'DEAN', 'DEAR', 'DEBT', 'DECK', 'DEED', 'DEEM', 'DEEP', 'DEER', 'DEMO', 'DENT', 'DENY', 'DESK', 'DIAL', 'DICE', 'DIED', 'DIET', 'DIME', 'DINE', 'DIRT', 'DISC', 'DISH', 'DISK', 'DIVE', 'DOCK', 'DOES', 'DOLE', 'DOLL', 'DOME', 'DONE', 'DOOM', 'DOOR', 'DOPE', 'DOSE', 'DOVE', 'DOWN', 'DOZE', 'DRAG', 'DRAW', 'DREW', 'DRIP', 'DROP', 'DRUG', 'DRUM', 'DUAL', 'DUCK', 'DUDE', 'DUEL', 'DUES', 'DUKE', 'DULL', 'DULY', 'DUMB', 'DUMP', 'DUNE', 'DUNK', 'DUSK', 'DUST', 'DUTY',
  'EACH', 'EARL', 'EARN', 'EASE', 'EAST', 'EASY', 'ECHO', 'EDGE', 'EDIT', 'ELSE', 'EMIT', 'ENVY', 'EPIC', 'EURO', 'EVEN', 'EVER', 'EVIL', 'EXAM', 'EXIT', 'EXPO', 'EYED', 'EYES',
  'FACE', 'FACT', 'FADE', 'FAIL', 'FAIR', 'FAKE', 'FALL', 'FAME', 'FANG', 'FARE', 'FARM', 'FAST', 'FATE', 'FAWN', 'FEAR', 'FEAT', 'FEED', 'FEEL', 'FEET', 'FELL', 'FELT', 'FEND', 'FERN', 'FEST', 'FILE', 'FILL', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIST', 'FIVE', 'FLAG', 'FLAN', 'FLAP', 'FLAT', 'FLAW', 'FLEA', 'FLED', 'FLEE', 'FLEW', 'FLIP', 'FLIT', 'FLOG', 'FLOP', 'FLOW', 'FOAM', 'FOES', 'FOIL', 'FOLD', 'FOLK', 'FOND', 'FONT', 'FOOD', 'FOOL', 'FOOT', 'FORD', 'FORE', 'FORK', 'FORM', 'FORT', 'FOUL', 'FOUR', 'FOWL', 'FREE', 'FROM', 'FUEL', 'FULL', 'FUME', 'FUND', 'FUNK', 'FUSE', 'FUSS',
  'GAIN', 'GAIT', 'GALA', 'GALE', 'GALL', 'GAME', 'GANG', 'GAPE', 'GARB', 'GASH', 'GASP', 'GATE', 'GAVE', 'GAZE', 'GEAR', 'GENE', 'GERM', 'GIFT', 'GILD', 'GILL', 'GILT', 'GIRL', 'GIST', 'GIVE', 'GLAD', 'GLEE', 'GLEN', 'GLIB', 'GLOB', 'GLOW', 'GLUE', 'GLUM', 'GLUT', 'GNAT', 'GNAW', 'GOAL', 'GOAT', 'GOES', 'GOLD', 'GOLF', 'GONE', 'GONG', 'GOOD', 'GOON', 'GORE', 'GORY', 'GOSH', 'GOWN', 'GRAB', 'GRAD', 'GRAM', 'GRAY', 'GREW', 'GREY', 'GRID', 'GRIM', 'GRIN', 'GRIP', 'GRIT', 'GROW', 'GULF', 'GULP', 'GURU', 'GUSH', 'GUST', 'GUTS',
  'HACK', 'HAIL', 'HAIR', 'HAJJ', 'HALE', 'HALF', 'HALL', 'HALT', 'HAND', 'HANG', 'HANK', 'HAQQ', 'HARD', 'HARE', 'HARM', 'HARP', 'HASH', 'HATE', 'HATH', 'HAUL', 'HAVE', 'HAWK', 'HAZE', 'HAZY', 'HEAD', 'HEAL', 'HEAP', 'HEAR', 'HEAT', 'HECK', 'HEED', 'HEEL', 'HEIR', 'HELD', 'HELM', 'HELP', 'HEMP', 'HERD', 'HERE', 'HERO', 'HERS', 'HIDE', 'HIGH', 'HIKE', 'HILL', 'HILT', 'HIND', 'HINT', 'HIRA', 'HIRE', 'HIVE', 'HOAX', 'HOLD', 'HOLE', 'HOLY', 'HOME', 'HONE', 'HOOD', 'HOOF', 'HOOK', 'HOOP', 'HOOT', 'HOPE', 'HORN', 'HOSE', 'HOST', 'HOUR', 'HOWL', 'HUBS', 'HUFF', 'HUGE', 'HULK', 'HULL', 'HUMP', 'HUNG', 'HUNK', 'HUNT', 'HURL', 'HURT', 'HUSH', 'HYMN',
  'ICED', 'ICON', 'IDEA', 'IDLE', 'IDOL', 'IMAM', 'INCH', 'INTO', 'IQRA', 'IRON', 'ISHA', 'ISLE', 'ITCH', 'ITEM',
  'JACK', 'JADE', 'JAIL', 'JAKE', 'JAMB', 'JANE', 'JAZZ', 'JEAN', 'JEEP', 'JEER', 'JELL', 'JERK', 'JEST', 'JILT', 'JINN', 'JINX', 'JIVE', 'JOBS', 'JOCK', 'JOIN', 'JOKE', 'JOLT', 'JOSH', 'JOWL', 'JOYS', 'JUDO', 'JUGS', 'JUDI', 'JUMP', 'JUNE', 'JUNK', 'JURY', 'JUST', 'JUTS',
  'KALE', 'KEEN', 'KEEP', 'KELP', 'KEPT', 'KEYS', 'KICK', 'KIDS', 'KILL', 'KILN', 'KILT', 'KIND', 'KING', 'KINK', 'KISS', 'KITE', 'KNEE', 'KNEW', 'KNIT', 'KNOB', 'KNOT', 'KNOW',
  'LABS', 'LACE', 'LACK', 'LACY', 'LADY', 'LAID', 'LAIR', 'LAKE', 'LAMB', 'LAME', 'LAMP', 'LAND', 'LANE', 'LARD', 'LARK', 'LASH', 'LASS', 'LAST', 'LATE', 'LAWN', 'LAWS', 'LAYS', 'LAZY', 'LEAD', 'LEAF', 'LEAK', 'LEAN', 'LEAP', 'LEFT', 'LEGS', 'LEND', 'LENS', 'LENT', 'LESS', 'LIAR', 'LICE', 'LICK', 'LIED', 'LIES', 'LIFE', 'LIFT', 'LIKE', 'LILY', 'LIMB', 'LIME', 'LIMP', 'LINE', 'LINK', 'LINT', 'LION', 'LIPS', 'LISP', 'LIST', 'LIVE', 'LOAD', 'LOAF', 'LOAM', 'LOAN', 'LOBE', 'LOCK', 'LODE', 'LOFT', 'LOGO', 'LOGS', 'LONE', 'LONG', 'LOOK', 'LOOM', 'LOOP', 'LOOT', 'LORD', 'LORE', 'LOSE', 'LOSS', 'LOST', 'LOTS', 'LOUD', 'LOUT', 'LOVE', 'LOWS', 'LUCK', 'LULL', 'LUMP', 'LUNG', 'LURE', 'LURK', 'LUSH', 'LUST',
  'MACE', 'MADE', 'MAID', 'MAIL', 'MAIM', 'MAIN', 'MAKE', 'MALE', 'MALL', 'MALT', 'MANE', 'MANY', 'MAPS', 'MARE', 'MARK', 'MARS', 'MART', 'MASH', 'MASK', 'MASS', 'MAST', 'MATE', 'MATH', 'MAUL', 'MAYO', 'MAZE', 'MEAD', 'MEAL', 'MEAN', 'MEAT', 'MEEK', 'MEET', 'MELD', 'MELT', 'MEMO', 'MEND', 'MENU', 'MERE', 'MESH', 'MESS', 'MICA', 'MICE', 'MILD', 'MILE', 'MILK', 'MILL', 'MIME', 'MIND', 'MINE', 'MINI', 'MINK', 'MINT', 'MIRE', 'MISS', 'MIST', 'MITE', 'MITT', 'MOAN', 'MOAT', 'MOCK', 'MODE', 'MOLD', 'MOLE', 'MOLT', 'MONK', 'MOOD', 'MOON', 'MOOR', 'MOOT', 'MORE', 'MORN', 'MOSS', 'MOST', 'MOTH', 'MOVE', 'MUCH', 'MUCK', 'MUFF', 'MUGS', 'MULE', 'MULL', 'MURK', 'MUSA', 'MUSE', 'MUSH', 'MUSK', 'MUST', 'MUTE', 'MYTH',
  'NAIL', 'NAME', 'NAPE', 'NAPS', 'NAFL', 'NAVY', 'NEAR', 'NEAT', 'NECK', 'NEED', 'NEON', 'NERD', 'NEST', 'NEWS', 'NEWT', 'NEXT', 'NICE', 'NICK', 'NIGH', 'NILE', 'NINE', 'NODE', 'NODS', 'NONE', 'NOOK', 'NOON', 'NOPE', 'NORM', 'NOSE', 'NOSY', 'NOTE', 'NOUN', 'NOVA', 'NUDE', 'NUKE', 'NULL', 'NUMB',
  'OATH', 'OATS', 'OBEY', 'ODDS', 'ODOR', 'OFFS', 'OGLE', 'OGRE', 'OILS', 'OILY', 'OKAY', 'OMEN', 'OMIT', 'ONCE', 'ONES', 'ONLY', 'ONTO', 'ONUS', 'OOZE', 'OPAL', 'OPEN', 'OPTS', 'OPUS', 'ORAL', 'ORBS', 'ORCA', 'ORES', 'OURS', 'OUST', 'OUTS', 'OVEN', 'OVER', 'OWED', 'OWES', 'OWLS', 'OWNS',
  'PACE', 'PACK', 'PACT', 'PADS', 'PAGE', 'PAID', 'PAIL', 'PAIN', 'PAIR', 'PALE', 'PALM', 'PALS', 'PANE', 'PANG', 'PANS', 'PAPA', 'PARE', 'PARK', 'PART', 'PASS', 'PAST', 'PATH', 'PATS', 'PAVE', 'PAWN', 'PAWS', 'PAYS', 'PEAK', 'PEAR', 'PEAS', 'PEAT', 'PECK', 'PEEL', 'PEEP', 'PEER', 'PEGS', 'PELT', 'PENS', 'PEON', 'PERK', 'PERM', 'PERT', 'PESO', 'PEST', 'PETS', 'PICK', 'PIER', 'PIES', 'PIGS', 'PIKE', 'PILE', 'PILL', 'PINE', 'PING', 'PINK', 'PINS', 'PINT', 'PIPE', 'PITS', 'PITY', 'PLAN', 'PLAY', 'PLEA', 'PLED', 'PLOD', 'PLOP', 'PLOT', 'PLOW', 'PLOY', 'PLUG', 'PLUM', 'PLUS', 'PODS', 'POEM', 'POET', 'POKE', 'POLE', 'POLL', 'POLO', 'POMP', 'POND', 'PONY', 'POOL', 'POOP', 'POOR', 'POPE', 'POPS', 'PORE', 'PORK', 'PORT', 'POSE', 'POSH', 'POST', 'POTS', 'POUR', 'POUT', 'PRAY', 'PREP', 'PREY', 'PROD', 'PROM', 'PROP', 'PROW', 'PUBS', 'PUCK', 'PUFF', 'PUGS', 'PULL', 'PULP', 'PUMP', 'PUNS', 'PUNT', 'PUNY', 'PUPS', 'PURE', 'PUSH', 'PUTS', 'PUTT',
  'QUAD', 'QUAY', 'QUIZ',
  'RACE', 'RACK', 'RAFT', 'RAGE', 'RAGS', 'RAID', 'RAIL', 'RAIN', 'RAKE', 'RAMP', 'RAMS', 'RANG', 'RANK', 'RANT', 'RAPE', 'RAPS', 'RAPT', 'RARE', 'RASH', 'RASP', 'RATE', 'RATS', 'RAVE', 'RAYS', 'RAZE', 'READ', 'REAL', 'REAM', 'REAP', 'REAR', 'REDO', 'REED', 'REEF', 'REEK', 'REEL', 'REFS', 'REIN', 'RELY', 'REND', 'RENT', 'REST', 'RIBS', 'RICE', 'RICH', 'RIDE', 'RIDS', 'RIFE', 'RIFF', 'RIFT', 'RIGS', 'RILE', 'RIMS', 'RIND', 'RING', 'RINK', 'RIOT', 'RIPE', 'RIPS', 'RISE', 'RISK', 'RITE', 'ROAD', 'ROAM', 'ROAR', 'ROBE', 'ROBS', 'ROCK', 'RODE', 'RODS', 'ROLE', 'ROLL', 'ROMP', 'ROOF', 'ROOM', 'ROOT', 'ROPE', 'ROSE', 'ROSY', 'ROTS', 'ROUT', 'ROVE', 'ROWS', 'RUBS', 'RUBY', 'RUDE', 'RUED', 'RUES', 'RUFF', 'RUGS', 'RUIN', 'RULE', 'RUMP', 'RUMS', 'RUNG', 'RUNS', 'RUNT', 'RUSE', 'RUSH', 'RUST', 'RUTS',
  'SACK', 'SABR', 'SAFE', 'SAGA', 'SAGE', 'SAGS', 'SAID', 'SAIL', 'SAKE', 'SALE', 'SALT', 'SAME', 'SAND', 'SANE', 'SANG', 'SANK', 'SAPS', 'SASH', 'SASS', 'SAVE', 'SAWM', 'SAWS', 'SAYS', 'SEAL', 'SEAM', 'SEAR', 'SEAS', 'SEAT', 'SECT', 'SEED', 'SEEK', 'SEEM', 'SEEN', 'SEEP', 'SEER', 'SEES', 'SELF', 'SELL', 'SEMI', 'SEND', 'SENT', 'SETS', 'SEWN', 'SEWS', 'SHED', 'SHIM', 'SHIN', 'SHIP', 'SHIV', 'SHOD', 'SHOE', 'SHOO', 'SHOP', 'SHOT', 'SHOW', 'SHUN', 'SHUT', 'SICK', 'SIDE', 'SIFT', 'SIGH', 'SIGN', 'SILK', 'SILL', 'SILO', 'SILT', 'SINE', 'SING', 'SINK', 'SINS', 'SIPS', 'SIRE', 'SIRS', 'SITE', 'SITS', 'SIZE', 'SKEW', 'SKID', 'SKIM', 'SKIN', 'SKIP', 'SKIT', 'SLAB', 'SLAG', 'SLAM', 'SLAP', 'SLAT', 'SLAW', 'SLAY', 'SLED', 'SLEW', 'SLID', 'SLIM', 'SLIT', 'SLOB', 'SLOE', 'SLOG', 'SLOP', 'SLOT', 'SLOW', 'SLUG', 'SLUM', 'SLUR', 'SMOG', 'SNAG', 'SNAP', 'SNIP', 'SNOB', 'SNOT', 'SNOW', 'SNUB', 'SNUG', 'SOAK', 'SOAP', 'SOAR', 'SOBS', 'SOCK', 'SODA', 'SODS', 'SOFA', 'SOFT', 'SOIL', 'SOLD', 'SOLE', 'SOLO', 'SOME', 'SONG', 'SONS', 'SOON', 'SOOT', 'SOPS', 'SORE', 'SORT', 'SOUL', 'SOUP', 'SOUR', 'SOWN', 'SOWS', 'SPAN', 'SPAR', 'SPAS', 'SPAT', 'SPEC', 'SPED', 'SPIN', 'SPIT', 'SPOT', 'SPRY', 'SPUD', 'SPUN', 'SPUR', 'STAB', 'STAG', 'STAR', 'STAT', 'STAY', 'STEM', 'STEP', 'STEW', 'STIR', 'STOP', 'STOW', 'STUB', 'STUD', 'STUN', 'SUCH', 'SUCK', 'SUDS', 'SUED', 'SUES', 'SUET', 'SUIT', 'SULK', 'SUMO', 'SUMP', 'SUMS', 'SUNG', 'SUNK', 'SUNS', 'SURE', 'SURF', 'SWAB', 'SWAG', 'SWAM', 'SWAN', 'SWAP', 'SWAT', 'SWAY', 'SWIG', 'SWIM', 'SWUM', 'SYNC',
  'TABS', 'TACK', 'TACO', 'TACT', 'TADS', 'TAGS', 'TAIL', 'TAKE', 'TALE', 'TALK', 'TALL', 'TAME', 'TAMP', 'TANG', 'TANK', 'TAPE', 'TAPS', 'TARN', 'TARO', 'TARP', 'TARS', 'TART', 'TASK', 'TAXI', 'TEAK', 'TEAL', 'TEAM', 'TEAR', 'TEAS', 'TEAT', 'TECH', 'TEED', 'TEEM', 'TEEN', 'TELL', 'TEMP', 'TEND', 'TENS', 'TENT', 'TERM', 'TERN', 'TEST', 'TEXT', 'THAN', 'THAT', 'THAW', 'THEE', 'THEM', 'THEN', 'THEW', 'THEY', 'THIN', 'THIS', 'THUD', 'THUG', 'THUS', 'TICK', 'TIDE', 'TIDY', 'TIED', 'TIER', 'TIES', 'TIFF', 'TILE', 'TILL', 'TILT', 'TIME', 'TINE', 'TING', 'TINS', 'TINT', 'TINY', 'TIPS', 'TIRE', 'TOAD', 'TOES', 'TOFU', 'TOGA', 'TOGS', 'TOIL', 'TOLD', 'TOLL', 'TOMB', 'TOME', 'TONE', 'TONG', 'TONS', 'TONY', 'TOOK', 'TOOL', 'TOOT', 'TOPS', 'TORE', 'TORN', 'TORT', 'TOSS', 'TOTE', 'TOTS', 'TOUR', 'TOUT', 'TOWN', 'TOWS', 'TOYS', 'TRAM', 'TRAP', 'TRAY', 'TREE', 'TREK', 'TREY', 'TRIG', 'TRIM', 'TRIO', 'TRIP', 'TROD', 'TROT', 'TRUE', 'TSAR', 'TUBA', 'TUBE', 'TUBS', 'TUCK', 'TUFT', 'TUGS', 'TUNA', 'TUNE', 'TURF', 'TURN', 'TUSK', 'TUTU', 'TWIG', 'TWIN', 'TWIT', 'TWOS', 'TYPE', 'TYPO',
  'UGLY', 'UNDO', 'UHUD', 'UMAR', 'UNIT', 'UNTO', 'UPON', 'URGE', 'URNS', 'USED', 'USER', 'USES',
  'VAIN', 'VALE', 'VAMP', 'VANE', 'VANS', 'VARY', 'VASE', 'VAST', 'VATS', 'VEAL', 'VEER', 'VEIL', 'VEIN', 'VEND', 'VENT', 'VERB', 'VERY', 'VEST', 'VETO', 'VETS', 'VIAL', 'VICE', 'VIED', 'VIES', 'VIEW', 'VILE', 'VINE', 'VISA', 'VISE', 'VOID', 'VOLT', 'VOTE', 'VOWS',
  'WADE', 'WADS', 'WAFT', 'WAGE', 'WAGS', 'WAIL', 'WAIT', 'WAKE', 'WALK', 'WALL', 'WAND', 'WANE', 'WANT', 'WARD', 'WARE', 'WARM', 'WARN', 'WARP', 'WARS', 'WART', 'WARY', 'WASH', 'WASP', 'WAVE', 'WAVY', 'WAXY', 'WAYS', 'WEAK', 'WEAL', 'WEAN', 'WEAR', 'WEDS', 'WEED', 'WEEK', 'WEEP', 'WELD', 'WELL', 'WELT', 'WENT', 'WEPT', 'WERE', 'WEST', 'WHAM', 'WHAT', 'WHEN', 'WHET', 'WHEY', 'WHIM', 'WHIP', 'WHIR', 'WHIT', 'WHIZ', 'WHOM', 'WICK', 'WIDE', 'WIFE', 'WIGS', 'WILD', 'WILL', 'WILT', 'WILY', 'WIMP', 'WIND', 'WINE', 'WING', 'WINK', 'WINS', 'WIPE', 'WIRE', 'WIRY', 'WISE', 'WISH', 'WISP', 'WITH', 'WITS', 'WOKE', 'WOKS', 'WOLF', 'WOMB', 'WONT', 'WOOD', 'WOOF', 'WOOL', 'WOOS', 'WORD', 'WORE', 'WORK', 'WORM', 'WORN', 'WORT', 'WOVE', 'WOWS', 'WRAP', 'WREN', 'WRIT', 'WUDU',
  'YACK', 'YAKS', 'YAMS', 'YANG', 'YANK', 'YAPS', 'YARD', 'YARN', 'YAWN', 'YAWS', 'YEAH', 'YEAR', 'YEAS', 'YELL', 'YELP', 'YENS', 'YEPS', 'YEWS', 'YOGI', 'YOKE', 'YOLK', 'YORE', 'YOUR', 'YOWL', 'YUAN', 'YUCK', 'YULE', 'YUPS',
  'ZANY', 'ZAPS', 'ZEAL', 'ZERO', 'ZEST', 'ZINC', 'ZING', 'ZIPS', 'ZONE', 'ZOOM', 'ZOOS',
  // 5-letter Islamic + common
  'AALIM', 'AARON', 'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADAPT', 'ADMIT', 'ADOPT', 'ADULT', 'ADHAN', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'AIMED', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIM', 'ALIVE', 'ALLAH', 'ALLEY', 'ALLOW', 'ALLOY', 'ALONE', 'ALONG', 'ALPHA', 'ALTER', 'AMONG', 'ANGEL', 'ANGER', 'ANGLE', 'ANGRY', 'ANKLE', 'ANSAR', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARMOR', 'AROMA', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'ATLAS', 'ATTIC', 'AUDIO', 'AUDIT', 'AVOID', 'AWAIT', 'AWAKE', 'AWARD', 'AWARE', 'AWFUL', 'AYYUB', 'AZIZ',
  'BACON', 'BADGE', 'BADLY', 'BAKER', 'BASIR', 'BASED', 'BASIC', 'BASIN', 'BASIS', 'BATCH', 'BEACH', 'BEAST', 'BEGAN', 'BEGIN', 'BEING', 'BELLY', 'BELOW', 'BENCH', 'BERRY', 'BIBLE', 'BILAL', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLEND', 'BLESS', 'BLIND', 'BLOCK', 'BLOND', 'BLOOD', 'BLOOM', 'BLUES', 'BLUNT', 'BOARD', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROOK', 'BROOM', 'BROTH', 'BROWN', 'BRUSH', 'BUILD', 'BUILT', 'BUNCH', 'BURAQ', 'BURNT', 'BURST', 'BUYER',
  'CABIN', 'CABLE', 'CAMEL', 'CANAL', 'CANDY', 'CARGO', 'CARRY', 'CARVE', 'CATCH', 'CAUSE', 'CEASE', 'CHAIN', 'CHAIR', 'CHALK', 'CHAMP', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHEAT', 'CHECK', 'CHEEK', 'CHEER', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHORD', 'CHOSE', 'CHUNK', 'CIDER', 'CIGAR', 'CINCH', 'CIRCA', 'CIVIC', 'CIVIL', 'CLAIM', 'CLAMP', 'CLASH', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB', 'CLING', 'CLOCK', 'CLONE', 'CLOSE', 'CLOTH', 'CLOUD', 'CLOWN', 'COACH', 'COAST', 'COCOA', 'COLON', 'COLOR', 'COMET', 'COMIC', 'COMMA', 'CORAL', 'COUCH', 'COUGH', 'COULD', 'COUNT', 'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRANE', 'CRASH', 'CRAWL', 'CRAZE', 'CRAZY', 'CREAM', 'CREEK', 'CREEP', 'CREST', 'CRIME', 'CRISP', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CRUEL', 'CRUSH', 'CRUST', 'CUBIC', 'CURVE', 'CYCLE',
  'DAILY', 'DAIRY', 'DANCE', 'DATED', 'DAWAH', 'DAWUD', 'DEALT', 'DEATH', 'DEBUT', 'DECAY', 'DECOR', 'DECOY', 'DELAY', 'DELTA', 'DENSE', 'DEPOT', 'DEPTH', 'DERBY', 'DESKS', 'DEVIL', 'DHIKR', 'DHUHR', 'DIARY', 'DIGIT', 'DIRTY', 'DISCO', 'DITCH', 'DIVER', 'DIZZY', 'DOING', 'DONOR', 'DONUT', 'DOUBT', 'DOUGH', 'DOZEN', 'DRAFT', 'DRAIN', 'DRAKE', 'DRAMA', 'DRANK', 'DRAWL', 'DRAWN', 'DREAD', 'DREAM', 'DRESS', 'DRIED', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DRONE', 'DROVE', 'DROWN', 'DRUGS', 'DRUNK', 'DRYER', 'DRYLY', 'DUSTY',
  'EAGER', 'EAGLE', 'EARLY', 'EARTH', 'EASED', 'EASEL', 'EATEN', 'EATER', 'EBONY', 'EDGES', 'EERIE', 'EGYPT', 'EIGHT', 'ELBOW', 'ELDER', 'ELECT', 'ELITE', 'ELOPE', 'ELUDE', 'EMAIL', 'EMBED', 'EMBER', 'EMPTY', 'ENDOW', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'EQUIP', 'ERASE', 'ERECT', 'ERROR', 'ERUPT', 'ESSAY', 'ETHER', 'EVADE', 'EVENT', 'EVERY', 'EXACT', 'EXALT', 'EXCEL', 'EXIST', 'EXPAT', 'EXTRA', 'EXULT',
  'FABLE', 'FACET', 'FAINT', 'FAIRY', 'FAITH', 'FALSE', 'FANCY', 'FATAL', 'FATTY', 'FATWA', 'FAULT', 'FAUNA', 'FAVOR', 'FEAST', 'FEIGN', 'FEMUR', 'FENCE', 'FERRY', 'FETCH', 'FEVER', 'FIBER', 'FIBRE', 'FIELD', 'FIEND', 'FIERY', 'FIFTY', 'FIGHT', 'FILTH', 'FINAL', 'FINCH', 'FIRST', 'FIXED', 'FIXER', 'FLAGS', 'FLAIR', 'FLAKE', 'FLAME', 'FLANK', 'FLARE', 'FLASH', 'FLASK', 'FLATS', 'FLEET', 'FLESH', 'FLICK', 'FLIER', 'FLING', 'FLINT', 'FLOAT', 'FLOCK', 'FLOOD', 'FLOOR', 'FLORA', 'FLOUR', 'FLOWS', 'FLUID', 'FLUKE', 'FLUNG', 'FLUSH', 'FLUTE', 'FOCAL', 'FOCUS', 'FOGGY', 'FOLLY', 'FORCE', 'FORGE', 'FORGO', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FOXES', 'FOYER', 'FRAIL', 'FRAME', 'FRANK', 'FRAUD', 'FREAK', 'FREED', 'FRESH', 'FRIAR', 'FRIED', 'FRILL', 'FRISK', 'FRONT', 'FROST', 'FROTH', 'FROZE', 'FRUIT', 'FUDGE', 'FULLY', 'FUNGI', 'FUNKY', 'FUNNY', 'FURRY', 'FUSSY', 'FUZZY',
  'GAILY', 'GAINS', 'GAMMA', 'GASES', 'GAUGE', 'GAUNT', 'GAUZE', 'GAUZY', 'GAVEL', 'GAWKY', 'GAZED', 'GEESE', 'GENES', 'GENIE', 'GENRE', 'GHUSL', 'GIANT', 'GIFTS', 'GIRLY', 'GIRTH', 'GIVEN', 'GIVER', 'GIVES', 'GIZMO', 'GLADE', 'GLAND', 'GLARE', 'GLASS', 'GLAZE', 'GLEAM', 'GLEAN', 'GLIDE', 'GLINT', 'GLOAT', 'GLOBE', 'GLOOM', 'GLORY', 'GLOSS', 'GLOVE', 'GNASH', 'GNOME', 'GOATS', 'GODLY', 'GOING', 'GOOSE', 'GORGE', 'GRAFT', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRAPH', 'GRASP', 'GRASS', 'GRATE', 'GRAVE', 'GRAVY', 'GRAZE', 'GREAT', 'GREED', 'GREEK', 'GREEN', 'GREET', 'GRIEF', 'GRILL', 'GRIME', 'GRIND', 'GROAN', 'GROOM', 'GROPE', 'GROSS', 'GROUP', 'GROVE', 'GROWL', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'GUILD', 'GUILT', 'GUISE', 'GULCH', 'GULLY', 'GUMMY', 'GUSTO', 'GUSTY',
  'HABIL', 'HABIT', 'HAFIZ', 'HAGAR', 'HAIKU', 'HAIRS', 'HAIRY', 'HAKIM', 'HALAL', 'HALVE', 'HAMZA', 'HANDY', 'HAPPY', 'HARAM', 'HARDY', 'HARUN', 'HARSH', 'HASTE', 'HASTY', 'HATCH', 'HATED', 'HATER', 'HAUNT', 'HAVEN', 'HAVOC', 'HAWWA', 'HAZEL', 'HEADS', 'HEADY', 'HEARD', 'HEART', 'HEATH', 'HEAVE', 'HEAVY', 'HEDGE', 'HEIRS', 'HEIST', 'HELLO', 'HENCE', 'HERBS', 'HERON', 'HIJRA', 'HILLS', 'HILLY', 'HINGE', 'HIPPO', 'HIRED', 'HITCH', 'HOBBY', 'HOIST', 'HOLLY', 'HOMER', 'HONEY', 'HONOR', 'HOOKS', 'HOPED', 'HORDE', 'HORSE', 'HOSTS', 'HOTEL', 'HOUND', 'HOURS', 'HOUSE', 'HOVER', 'HUMAN', 'HUMID', 'HUMOR', 'HUMPS', 'HUMUS', 'HUNCH', 'HUNKY', 'HURRY', 'HUSKY', 'HYENA', 'HYMNS',
  'IBLIS', 'ICIER', 'ICILY', 'ICING', 'IDEAL', 'IDEAS', 'IDIOM', 'IDIOT', 'IDRIS', 'IHRAM', 'IHSAN', 'ILYAS', 'IMAGE', 'IMPLY', 'INBOX', 'INCUR', 'INDEX', 'INEPT', 'INERT', 'INFER', 'INJIL', 'INNER', 'INPUT', 'INTER', 'INTRO', 'IONIC', 'IRATE', 'IRKED', 'IRONY', 'ISHAQ', 'ISLAM', 'IVORY',
  'JACKS', 'JADED', 'JALUT', 'JAUNT', 'JAZZY', 'JEANS', 'JEERS', 'JELLY', 'JERKS', 'JERKY', 'JESUS', 'JEWEL', 'JIFFY', 'JOINS', 'JOINT', 'JOKER', 'JOKES', 'JOLLY', 'JOLTS', 'JOUST', 'JUDGE', 'JUICE', 'JUICY', 'JUMBO', 'JUMPS', 'JUMPY', 'JUNTA', 'JUROR',
  'KAABA', 'KARMA', 'KAYAK', 'KEBAB', 'KEELS', 'KEEPS', 'KETCH', 'KEYED', 'KHIDR', 'KICKS', 'KILLS', 'KINDS', 'KINGS', 'KIOSK', 'KITES', 'KITTY', 'KNACK', 'KNEAD', 'KNEED', 'KNEEL', 'KNEES', 'KNELT', 'KNIFE', 'KNOCK', 'KNOLL', 'KNOTS', 'KNOWN', 'KNOWS', 'KUDOS',
  'LABEL', 'LABOR', 'LACED', 'LACKS', 'LADEN', 'LADLE', 'LAGER', 'LAKES', 'LAMBS', 'LAMPS', 'LANCE', 'LANDS', 'LANES', 'LAPEL', 'LAPSE', 'LARGE', 'LARVA', 'LASER', 'LASSO', 'LATCH', 'LATER', 'LATEX', 'LAUGH', 'LAYER', 'LAYUP', 'LEACH', 'LEADS', 'LEAFY', 'LEAKS', 'LEAKY', 'LEANT', 'LEAPS', 'LEAPT', 'LEARN', 'LEASE', 'LEASH', 'LEAST', 'LEAVE', 'LEDGE', 'LEECH', 'LEEKS', 'LEFTY', 'LEGAL', 'LEMON', 'LEMUR', 'LENDS', 'LEVEL', 'LEVER', 'LIGHT', 'LILAC', 'LIMBO', 'LIMBS', 'LIMIT', 'LINED', 'LINEN', 'LINER', 'LINES', 'LINGO', 'LINKS', 'LIONS', 'LISTS', 'LITER', 'LITRE', 'LIVED', 'LIVEN', 'LIVER', 'LIVES', 'LIVID', 'LLAMA', 'LOADS', 'LOAFS', 'LOANS', 'LOBBY', 'LOBES', 'LOCAL', 'LOCKS', 'LODGE', 'LOFTY', 'LOGIC', 'LOGOS', 'LOINS', 'LONER', 'LOOKS', 'LOONY', 'LOOPS', 'LOOPY', 'LOOSE', 'LOOTS', 'LORDS', 'LORRY', 'LOSER', 'LOSES', 'LOTUS', 'LOUSE', 'LOUSY', 'LOUTS', 'LOVED', 'LOVER', 'LOVES', 'LOWER', 'LOYAL', 'LUCID', 'LUCKY', 'LUMEN', 'LUMPS', 'LUMPY', 'LUNAR', 'LUNCH', 'LUNGE', 'LUNGS', 'LURCH', 'LURED', 'LURES', 'LURID', 'LURKS', 'LUSTY', 'LYING', 'LYMPH', 'LYNCH', 'LYRIC',
  'MACHO', 'MACRO', 'MADAM', 'MADLY', 'MAFIA', 'MAGIC', 'MAGMA', 'MAIDS', 'MAILS', 'MAIMS', 'MAINS', 'MAIZE', 'MAJID', 'MAJOR', 'MAKER', 'MAKES', 'MALIK', 'MAMBO', 'MANGO', 'MANIA', 'MANIC', 'MANNA', 'MANOR', 'MAPLE', 'MARCH', 'MARES', 'MARKS', 'MARSH', 'MASKS', 'MASON', 'MATCH', 'MATES', 'MATHS', 'MAXIM', 'MAYOR', 'MAZES', 'MEALS', 'MEANS', 'MEANT', 'MEATY', 'MECCA', 'MEDAL', 'MEDIA', 'MEDIC', 'MEETS', 'MELEE', 'MELON', 'MELTS', 'MEMOS', 'MENDS', 'MENUS', 'MERCY', 'MERGE', 'MERIT', 'MERRY', 'MESSY', 'METAL', 'METER', 'METRO', 'MICRO', 'MIDST', 'MIGHT', 'MILLS', 'MIMIC', 'MINCE', 'MINDS', 'MINED', 'MINER', 'MINES', 'MINOR', 'MINUS', 'MIRAJ', 'MIRTH', 'MISER', 'MISSY', 'MISTY', 'MITES', 'MIXES', 'MOANS', 'MOATS', 'MODEL', 'MODEM', 'MODES', 'MOIST', 'MOLAR', 'MOLDS', 'MOLDY', 'MOLES', 'MOLTS', 'MOMMY', 'MONEY', 'MONKS', 'MONTH', 'MOODS', 'MOODY', 'MOONS', 'MOOSE', 'MORAL', 'MORPH', 'MOSES', 'MOTEL', 'MOTHS', 'MOTOR', 'MOTTO', 'MOULD', 'MOUND', 'MOUNT', 'MOURN', 'MOUSE', 'MOUSY', 'MOUTH', 'MOVED', 'MOVER', 'MOVES', 'MOVIE', 'MOWED', 'MOWER', 'MUCUS', 'MUDDY', 'MUFFS', 'MUMMY', 'MUMPS', 'MUNCH', 'MURAL', 'MURKY', 'MUSHY', 'MUSIC', 'MUSKY', 'MUSTY', 'MYTHS',
  'NAILS', 'NAIVE', 'NAKED', 'NAMED', 'NAMER', 'NAMES', 'NANNY', 'NASAL', 'NASTY', 'NAVAL', 'NAVEL', 'NEEDY', 'NERVE', 'NERVY', 'NEVER', 'NEWER', 'NEWLY', 'NICHE', 'NIECE', 'NIGHT', 'NINTH', 'NOBLE', 'NOISE', 'NOISY', 'NOMAD', 'NORMS', 'NORTH', 'NOSEY', 'NOTCH', 'NOTED', 'NOTES', 'NOVEL', 'NUDGE', 'NURSE', 'NUTTY', 'NYLON', 'NYMPH',
  'OAKEN', 'OASIS', 'OCCUR', 'OCEAN', 'OCTET', 'ODDLY', 'OFFER', 'OFTEN', 'OILED', 'OILER', 'OLDER', 'OLIVE', 'ONSET', 'OPERA', 'OPTIC', 'ORBIT', 'ORDER', 'ORGAN', 'OTHER', 'OTTER', 'OUGHT', 'OUNCE', 'OUTDO', 'OUTED', 'OUTER', 'OVARY', 'OVERT', 'OWING', 'OWNED', 'OWNER', 'OXIDE', 'OZONE',
  'PACED', 'PACER', 'PACES', 'PACKS', 'PADRE', 'PAGAN', 'PAGES', 'PAINS', 'PAINT', 'PAIRS', 'PALMS', 'PALSY', 'PANDA', 'PANEL', 'PANES', 'PANIC', 'PANTS', 'PAPAL', 'PAPER', 'PARCH', 'PARKS', 'PARSE', 'PARTS', 'PARTY', 'PASTA', 'PASTE', 'PASTY', 'PATCH', 'PATIO', 'PAUSE', 'PAVED', 'PAYER', 'PEACE', 'PEACH', 'PEAKS', 'PEARL', 'PEARS', 'PECKS', 'PEDAL', 'PEEKS', 'PEELS', 'PEEPS', 'PEERS', 'PENAL', 'PENCE', 'PENNY', 'PERCH', 'PERIL', 'PERKS', 'PERKY', 'PERMS', 'PESOS', 'PESTS', 'PETAL', 'PETTY', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PICKS', 'PICKY', 'PIECE', 'PIERS', 'PIETY', 'PIGGY', 'PILOT', 'PIMPS', 'PINCH', 'PINES', 'PINGS', 'PINTS', 'PIOUS', 'PIPED', 'PIPER', 'PIPES', 'PITCH', 'PITHS', 'PITHY', 'PITON', 'PIVOT', 'PIXEL', 'PIXIE', 'PIZZA', 'PLACE', 'PLAID', 'PLAIN', 'PLANE', 'PLANK', 'PLANS', 'PLANT', 'PLATE', 'PLAYS', 'PLAZA', 'PLEAD', 'PLEAS', 'PLEAT', 'PLIED', 'PLIES', 'PLODS', 'PLOPS', 'PLOTS', 'PLOWS', 'PLOYS', 'PLUCK', 'PLUGS', 'PLUMB', 'PLUME', 'PLUMP', 'PLUMS', 'PLUNK', 'PLUSH', 'POACH', 'POEMS', 'POETS', 'POINT', 'POISE', 'POKED', 'POKER', 'POKES', 'POLAR', 'POLES', 'POLLS', 'PONDS', 'POPES', 'POPPY', 'PORCH', 'PORES', 'PORTS', 'POSED', 'POSER', 'POSES', 'POSIT', 'POSTS', 'POUCH', 'POUND', 'POURS', 'POWER', 'PRANK', 'PRAWN', 'PRAYS', 'PREEN', 'PRESS', 'PREYS', 'PRICE', 'PRICK', 'PRIDE', 'PRIED', 'PRIES', 'PRIME', 'PRIMP', 'PRINT', 'PRIOR', 'PRISM', 'PRIVY', 'PRIZE', 'PROBE', 'PRODS', 'PROMS', 'PRONE', 'PRONG', 'PROOF', 'PROPS', 'PROSE', 'PROUD', 'PROVE', 'PROWL', 'PRUDE', 'PRUNE', 'PSALM', 'PUBIC', 'PULLS', 'PULPS', 'PULSE', 'PUMPS', 'PUNCH', 'PUNKS', 'PUPIL', 'PUPPY', 'PURGE', 'PURSE', 'PUSHY', 'PUTTY', 'PYGMY',
  'QABIL', 'QADIR', 'QUACK', 'QUAFF', 'QUAIL', 'QUALM', 'QUART', 'QUASI', 'QUEEN', 'QUEER', 'QUEST', 'QUEUE', 'QUICK', 'QUIET', 'QUILL', 'QUILT', 'QUIRK', 'QUITE', 'QUOTA', 'QUOTE', 'QURAN',
  'RABBI', 'RACER', 'RACES', 'RACKS', 'RADAR', 'RADIO', 'RADON', 'RAFTS', 'RAGED', 'RAGES', 'RAHIM', 'RAIDS', 'RAILS', 'RAINS', 'RAINY', 'RAISE', 'RAKED', 'RAKES', 'RALLY', 'RAMPS', 'RANCH', 'RANGE', 'RANKS', 'RAPID', 'RARER', 'RATED', 'RATER', 'RATES', 'RATIO', 'RAZOR', 'REACH', 'REACT', 'READS', 'READY', 'REALM', 'REAMS', 'REAPS', 'REARS', 'REBEL', 'RECAP', 'RECUR', 'REEDS', 'REEFS', 'REEKS', 'REELS', 'REFER', 'REGAL', 'REIGN', 'REINS', 'RELAX', 'RELAY', 'RELIC', 'REMIT', 'REMIX', 'RENAL', 'RENEW', 'RENTS', 'REPAY', 'REPEL', 'REPLY', 'RERUN', 'RESET', 'RESIN', 'RESTS', 'RETRY', 'REUSE', 'REVEL', 'REVUE', 'RHINO', 'RHYME', 'RIDER', 'RIDES', 'RIDGE', 'RIFLE', 'RIFTS', 'RIGHT', 'RIGID', 'RIGOR', 'RINDS', 'RINGS', 'RINSE', 'RIOTS', 'RIPEN', 'RIPER', 'RISEN', 'RISER', 'RISES', 'RISKS', 'RISKY', 'RITES', 'RITZY', 'RIVAL', 'RIVER', 'RIVET', 'ROADS', 'ROAMS', 'ROARS', 'ROAST', 'ROBED', 'ROBES', 'ROBIN', 'ROBOT', 'ROCKS', 'ROCKY', 'RODEO', 'ROGUE', 'ROLES', 'ROLLS', 'ROMAN', 'ROMPS', 'ROOFS', 'ROOMS', 'ROOMY', 'ROOST', 'ROOTS', 'ROPED', 'ROPES', 'ROSES', 'ROTOR', 'ROUGE', 'ROUGH', 'ROUND', 'ROUSE', 'ROUTE', 'ROVER', 'ROWDY', 'ROWED', 'ROWER', 'ROYAL', 'RULER', 'RULES', 'RUMOR', 'RUPEE', 'RURAL', 'RUSTY',
  'SABER', 'SABLE', 'SADLY', 'SAFER', 'SAFES', 'SAGES', 'SAINT', 'SAKES', 'SALAD', 'SALAH', 'SALAM', 'SALES', 'SALIH', 'SALON', 'SALSA', 'SALTY', 'SALVE', 'SALVO', 'SAMBA', 'SAMI', 'SANDY', 'SANER', 'SANTA', 'SARAH', 'SASSY', 'SATIN', 'SAUCE', 'SAUCY', 'SAUNA', 'SAUTE', 'SAVED', 'SAVER', 'SAVES', 'SAVOR', 'SAVVY', 'SCALE', 'SCALP', 'SCALY', 'SCAMP', 'SCAMS', 'SCANS', 'SCARE', 'SCARF', 'SCARY', 'SCENE', 'SCENT', 'SCOFF', 'SCOLD', 'SCONE', 'SCOOP', 'SCOOT', 'SCOPE', 'SCORE', 'SCORN', 'SCOUT', 'SCOWL', 'SCRAM', 'SCRAP', 'SCREW', 'SCRUB', 'SEALS', 'SEAMS', 'SEAMY', 'SEARS', 'SEATS', 'SECTS', 'SEEDS', 'SEEDY', 'SEEKS', 'SEEMS', 'SEEPS', 'SEIZE', 'SELLS', 'SENDS', 'SENSE', 'SEPIA', 'SERIF', 'SERUM', 'SERVE', 'SETUP', 'SEVEN', 'SEVER', 'SEWER', 'SHADE', 'SHADY', 'SHAFT', 'SHAKE', 'SHAKY', 'SHALE', 'SHALL', 'SHAME', 'SHAMS', 'SHAPE', 'SHARD', 'SHARE', 'SHARK', 'SHARP', 'SHAVE', 'SHAWL', 'SHEAR', 'SHEDS', 'SHEEN', 'SHEEP', 'SHEER', 'SHEET', 'SHEIK', 'SHELF', 'SHELL', 'SHIFT', 'SHIMS', 'SHINE', 'SHINS', 'SHINY', 'SHIPS', 'SHIRE', 'SHIRK', 'SHIRT', 'SHOCK', 'SHOES', 'SHONE', 'SHOOK', 'SHOOT', 'SHOPS', 'SHORE', 'SHORN', 'SHORT', 'SHOTS', 'SHOUT', 'SHOVE', 'SHOWN', 'SHOWS', 'SHOWY', 'SHRED', 'SHREW', 'SHRUB', 'SHRUG', 'SHUCK', 'SHUNS', 'SHUNT', 'SHUSH', 'SIDED', 'SIDES', 'SIEGE', 'SIGHS', 'SIGHT', 'SIGMA', 'SIGNS', 'SILKS', 'SILKY', 'SILLS', 'SILLY', 'SINCE', 'SINEW', 'SINGE', 'SINGS', 'SINKS', 'SIREN', 'SIRES', 'SISSY', 'SITES', 'SIXTH', 'SIXTY', 'SIZED', 'SIZER', 'SIZES', 'SKATE', 'SKEET', 'SKEIN', 'SKIDS', 'SKIED', 'SKIER', 'SKIES', 'SKILL', 'SKIMP', 'SKINS', 'SKIPS', 'SKIRT', 'SKITS', 'SKULK', 'SKULL', 'SKUNK', 'SLABS', 'SLACK', 'SLAGS', 'SLAIN', 'SLAKE', 'SLAMS', 'SLANG', 'SLANT', 'SLAPS', 'SLASH', 'SLATS', 'SLAVE', 'SLAYS', 'SLEEK', 'SLEEP', 'SLEET', 'SLEPT', 'SLICE', 'SLICK', 'SLIDE', 'SLIME', 'SLIMY', 'SLING', 'SLINK', 'SLIPS', 'SLITS', 'SLOBS', 'SLOES', 'SLOPE', 'SLOPS', 'SLOSH', 'SLOTH', 'SLOTS', 'SLOWS', 'SLUGS', 'SLUMS', 'SLUNG', 'SLUNK', 'SLURP', 'SLURS', 'SLUSH', 'SLYLY', 'SMACK', 'SMALL', 'SMART', 'SMASH', 'SMEAR', 'SMELL', 'SMELT', 'SMILE', 'SMIRK', 'SMITE', 'SMITH', 'SMOCK', 'SMOKE', 'SMOKY', 'SNACK', 'SNAFU', 'SNAGS', 'SNAIL', 'SNAKE', 'SNAKY', 'SNAPS', 'SNARE', 'SNARL', 'SNEAK', 'SNEER', 'SNIDE', 'SNIFF', 'SNIPE', 'SNIPS', 'SNOBS', 'SNOOP', 'SNORE', 'SNORT', 'SNOTS', 'SNOUT', 'SNOWS', 'SNOWY', 'SNUBS', 'SNUCK', 'SNUFF', 'SNUGS', 'SOAKS', 'SOAPS', 'SOAPY', 'SOARS', 'SOBER', 'SOCKS', 'SODAS', 'SOFAS', 'SOFTY', 'SOGGY', 'SOILS', 'SOLAR', 'SOLED', 'SOLES', 'SOLID', 'SOLOS', 'SOLVE', 'SONIC', 'SONGS', 'SONNY', 'SOOTH', 'SOOTS', 'SOOTY', 'SORRY', 'SORTS', 'SOULS', 'SOUND', 'SOUPS', 'SOUPY', 'SOURS', 'SOUTH', 'SOWED', 'SOWER', 'SPACE', 'SPADE', 'SPANS', 'SPARE', 'SPARK', 'SPARS', 'SPASM', 'SPAWN', 'SPEAK', 'SPEAR', 'SPECS', 'SPEED', 'SPELL', 'SPEND', 'SPENT', 'SPICE', 'SPICY', 'SPIED', 'SPIEL', 'SPIES', 'SPIKE', 'SPIKY', 'SPILL', 'SPINE', 'SPINS', 'SPINY', 'SPIRE', 'SPITE', 'SPITS', 'SPLAT', 'SPLIT', 'SPOIL', 'SPOKE', 'SPOOF', 'SPOOK', 'SPOOL', 'SPOON', 'SPORE', 'SPORT', 'SPOTS', 'SPOUT', 'SPRAY', 'SPREE', 'SPRIG', 'SPUDS', 'SPUNK', 'SPURN', 'SPURS', 'SPURT', 'SQUAD', 'SQUAT', 'SQUAW', 'SQUIB', 'SQUID', 'STABS', 'STACK', 'STAFF', 'STAGE', 'STAGS', 'STAID', 'STAIN', 'STAIR', 'STAKE', 'STALE', 'STALK', 'STALL', 'STAMP', 'STAND', 'STANK', 'STAPH', 'STARE', 'STARK', 'STARS', 'START', 'STASH', 'STATE', 'STAVE', 'STAYS', 'STEAD', 'STEAK', 'STEAL', 'STEAM', 'STEEL', 'STEEP', 'STEER', 'STEMS', 'STEPS', 'STERN', 'STEWS', 'STICK', 'STIFF', 'STILL', 'STILT', 'STING', 'STINK', 'STINT', 'STIRS', 'STOCK', 'STOIC', 'STOKE', 'STOLE', 'STOMP', 'STONE', 'STONY', 'STOOD', 'STOOL', 'STOOP', 'STOPS', 'STORE', 'STORK', 'STORM', 'STORY', 'STOUT', 'STOVE', 'STRAP', 'STRAW', 'STRAY', 'STREP', 'STREW', 'STRIP', 'STROP', 'STRUT', 'STUCK', 'STUDS', 'STUDY', 'STUFF', 'STUMP', 'STUNG', 'STUNK', 'STUNS', 'STUNT', 'STYLE', 'SUAVE', 'SUCKS', 'SUDSY', 'SUEDE', 'SUGAR', 'SUITE', 'SUITS', 'SULKY', 'SUNNI', 'SUNNY', 'SUPER', 'SURAH', 'SURGE', 'SURLY', 'SUSHI', 'SWABS', 'SWAMP', 'SWANS', 'SWAPS', 'SWARM', 'SWATH', 'SWATS', 'SWAYS', 'SWEAR', 'SWEAT', 'SWEEP', 'SWEET', 'SWELL', 'SWEPT', 'SWIFT', 'SWIGS', 'SWILL', 'SWIMS', 'SWINE', 'SWING', 'SWIPE', 'SWIRL', 'SWISH', 'SWISS', 'SWOON', 'SWOOP', 'SWORD', 'SWORE', 'SWORN', 'SWUNG', 'SYRUP',
  'TABLE', 'TABOO', 'TACIT', 'TACKS', 'TACKY', 'TACOS', 'TAILS', 'TAINT', 'TAKEN', 'TAKER', 'TAKES', 'TALES', 'TALKS', 'TALLY', 'TALON', 'TAMED', 'TAMER', 'TAMES', 'TANGS', 'TANGY', 'TANKS', 'TAPED', 'TAPER', 'TAPES', 'TAQWA', 'TARDY', 'TARPS', 'TARRY', 'TARTS', 'TASKS', 'TASTE', 'TASTY', 'TAUNT', 'TAWAF', 'TAWNY', 'TAXED', 'TAXES', 'TAXIS', 'TEACH', 'TEAMS', 'TEARS', 'TEARY', 'TEASE', 'TECHS', 'TEDDY', 'TEETH', 'TEMPO', 'TEMPS', 'TEMPT', 'TENDS', 'TENOR', 'TENSE', 'TENTH', 'TENTS', 'TEPEE', 'TEPID', 'TERMS', 'TERNS', 'TERRA', 'TESTS', 'TEXTS', 'THANK', 'THAWS', 'THEFT', 'THEIR', 'THEME', 'THICK', 'THIEF', 'THIGH', 'THING', 'THINK', 'THINS', 'THIRD', 'THONG', 'THORN', 'THOSE', 'THREE', 'THREW', 'THROB', 'THROW', 'THUDS', 'THUGS', 'THUMB', 'THUMP', 'TIARA', 'TIDAL', 'TIDED', 'TIDES', 'TIGER', 'TIGHT', 'TILED', 'TILER', 'TILES', 'TILTS', 'TIMED', 'TIMER', 'TIMES', 'TIMID', 'TINGE', 'TIPSY', 'TIRED', 'TIRES', 'TITAN', 'TITLE', 'TOAST', 'TODAY', 'TOFFS', 'TOGAS', 'TOILS', 'TOKEN', 'TOLLS', 'TOMBS', 'TONES', 'TONGS', 'TONIC', 'TOOLS', 'TOOTH', 'TOOTS', 'TOPIC', 'TOPSY', 'TORAH', 'TORCH', 'TORSO', 'TORTS', 'TORUS', 'TOTAL', 'TOTEM', 'TOUCH', 'TOUGH', 'TOURS', 'TOWED', 'TOWEL', 'TOWER', 'TOWNS', 'TOXIC', 'TOXIN', 'TRACE', 'TRACK', 'TRACT', 'TRADE', 'TRAIL', 'TRAIN', 'TRAIT', 'TRAMP', 'TRAMS', 'TRAPS', 'TRASH', 'TRAWL', 'TRAYS', 'TREAD', 'TREAT', 'TREES', 'TREKS', 'TREND', 'TRESS', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIER', 'TRIES', 'TRILL', 'TRIMS', 'TRIOS', 'TRIPS', 'TRITE', 'TROLL', 'TROMP', 'TROOP', 'TROPE', 'TROTS', 'TROUT', 'TROVE', 'TRUCE', 'TRUCK', 'TRULY', 'TRUMP', 'TRUNK', 'TRUSS', 'TRUST', 'TRUTH', 'TUBES', 'TUCKS', 'TULIP', 'TUMOR', 'TUNED', 'TUNER', 'TUNES', 'TUNIC', 'TURBO', 'TURDS', 'TURNS', 'TUTOR', 'TUTTI', 'TUTUS', 'TWAIN', 'TWANG', 'TWEAK', 'TWEED', 'TWEET', 'TWERP', 'TWICE', 'TWIGS', 'TWILL', 'TWINE', 'TWINS', 'TWIRL', 'TWIST', 'TYING', 'TYKES', 'TYPES',
  'UDDER', 'ULCER', 'ULTRA', 'UMBRA', 'UMMAH', 'UMRAH', 'UNCLE', 'UNCUT', 'UNDER', 'UNDID', 'UNDUE', 'UNFED', 'UNFIT', 'UNIFY', 'UNION', 'UNITE', 'UNITS', 'UNITY', 'UNLIT', 'UNMET', 'UNPIN', 'UNSAY', 'UNSET', 'UNTIE', 'UNTIL', 'UNWED', 'UNZIP', 'UPPER', 'UPSET', 'URBAN', 'URGED', 'URGES', 'URINE', 'USAGE', 'USHER', 'USING', 'USUAL', 'UTTER',
  'VAGUE', 'VALET', 'VALID', 'VALOR', 'VALUE', 'VALVE', 'VAMPS', 'VANES', 'VAPID', 'VAPOR', 'VAULT', 'VAUNT', 'VEERS', 'VEILS', 'VEINS', 'VEINY', 'VENOM', 'VENTS', 'VENUE', 'VERBS', 'VERGE', 'VERSE', 'VEXED', 'VEXES', 'VIBES', 'VICAR', 'VIDEO', 'VIEWS', 'VIGIL', 'VIGOR', 'VILER', 'VILLA', 'VINES', 'VINYL', 'VIOLA', 'VIOLS', 'VIPER', 'VIRAL', 'VIRUS', 'VISOR', 'VISTA', 'VITAL', 'VIVID', 'VIXEN', 'VOCAL', 'VODKA', 'VOGUE', 'VOICE', 'VOIDS', 'VOLTS', 'VOMIT', 'VOTED', 'VOTER', 'VOTES', 'VOUCH', 'VOWED', 'VOWEL', 'VULVA',
  'WACKY', 'WADED', 'WADER', 'WADES', 'WADUD', 'WAFER', 'WAFTS', 'WAGED', 'WAGER', 'WAGES', 'WAGON', 'WAHAB', 'WAIFS', 'WAILS', 'WAIST', 'WAITS', 'WAIVE', 'WAKED', 'WAKEN', 'WAKES', 'WAKIL', 'WALKS', 'WALLS', 'WALTZ', 'WANDS', 'WANED', 'WANES', 'WANTS', 'WARDS', 'WARES', 'WARMS', 'WARNS', 'WARPS', 'WARTS', 'WARTY', 'WASHY', 'WASPS', 'WASTE', 'WATCH', 'WATER', 'WATTS', 'WAVED', 'WAVER', 'WAVES', 'WAXED', 'WAXEN', 'WAXES', 'WEARY', 'WEAVE', 'WEBBY', 'WEDGE', 'WEEDS', 'WEEDY', 'WEEKS', 'WEIGH', 'WEIRD', 'WELDS', 'WELLS', 'WELSH', 'WELTS', 'WENCH', 'WENDS', 'WHACK', 'WHALE', 'WHARF', 'WHEAT', 'WHEEL', 'WHELP', 'WHERE', 'WHICH', 'WHIFF', 'WHILE', 'WHIMS', 'WHINE', 'WHINY', 'WHIPS', 'WHIRL', 'WHISK', 'WHITE', 'WHITS', 'WHOLE', 'WHOMP', 'WHOOP', 'WHOSE', 'WICKS', 'WIDEN', 'WIDER', 'WIDOW', 'WIDTH', 'WIELD', 'WIGGY', 'WILDS', 'WILED', 'WILES', 'WILLS', 'WILLY', 'WILTS', 'WIMPS', 'WIMPY', 'WINCE', 'WINCH', 'WINDS', 'WINDY', 'WINED', 'WINER', 'WINES', 'WINGS', 'WINKS', 'WIPED', 'WIPER', 'WIPES', 'WIRED', 'WIRER', 'WIRES', 'WISED', 'WISER', 'WISPS', 'WISPY', 'WITCH', 'WITHE', 'WITHS', 'WITTY', 'WIVES', 'WIZEN', 'WOKEN', 'WOMAN', 'WOMEN', 'WOODS', 'WOODY', 'WOOED', 'WOOER', 'WOOFS', 'WOOLS', 'WOOLY', 'WOOZY', 'WORDS', 'WORDY', 'WORKS', 'WORLD', 'WORMS', 'WORMY', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WOVEN', 'WRACK', 'WRAPS', 'WRATH', 'WREAK', 'WRECK', 'WREST', 'WRING', 'WRIST', 'WRITE', 'WRITS', 'WRONG', 'WROTE', 'WRUNG',
  'YACHT', 'YAHOO', 'YAHYA', 'YANKS', 'YAQUB', 'YARDS', 'YARNS', 'YAWNS', 'YEAHS', 'YEARN', 'YEARS', 'YEAST', 'YELLS', 'YELPS', 'YIELD', 'YODEL', 'YOKES', 'YOLKS', 'YOUNG', 'YOURS', 'YOUTH', 'YOWLS', 'YUMMY', 'YUNUS', 'YURTS', 'YUSUF',
  'ZABUR', 'ZAPPY', 'ZEALS', 'ZEBRA', 'ZEROS', 'ZESTS', 'ZESTY', 'ZILCH', 'ZINCS', 'ZINGY', 'ZONED', 'ZONER', 'ZONES', 'ZOOMS',
]);

/**
 * Simple pattern matching for arc consistency
 */
function patternMatchesWord(pattern: string, word: string): boolean {
  if (pattern.length !== word.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== '_' && pattern[i] !== word[i]) return false;
  }
  return true;
}

/**
 * Check if any word in dictionary matches pattern
 */
function hasMatchingWord(pattern: string): boolean {
  if (pattern.length < 2) return false;
  for (const word of COMMON_2_5_WORDS) {
    if (patternMatchesWord(pattern, word)) return true;
  }
  return false;
}

/**
 * Get perpendicular slot pattern for a position
 */
function getPerpendicularPattern(
  grid: Cell[][],
  row: number,
  col: number,
  mainDirection: Direction,
  wordChar: string
): string | null {
  const perpDir = mainDirection === "ACROSS" ? "DOWN" : "ACROSS";

  // Find start of perpendicular slot
  let startR = row;
  let startC = col;

  if (perpDir === "DOWN") {
    while (startR > 0 && !grid[startR - 1][col].isBlack) startR--;
  } else {
    while (startC > 0 && !grid[row][startC - 1].isBlack) startC--;
  }

  // Build pattern
  let pattern = '';
  let r = startR;
  let c = startC;

  while (r < 5 && c < 5 && !grid[r][c].isBlack) {
    if (r === row && c === col) {
      pattern += wordChar;
    } else if (grid[r][c].letter) {
      pattern += grid[r][c].letter;
    } else {
      pattern += '_';
    }
    if (perpDir === "DOWN") r++;
    else c++;
  }

  return pattern.length >= 2 ? pattern : null;
}

/**
 * Check arc consistency for a word placement
 */
function checkArcConsistency(
  grid: Cell[][],
  word: string,
  row: number,
  col: number,
  direction: Direction
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = direction === "ACROSS" ? row : row + i;
    const c = direction === "ACROSS" ? col + i : col;

    // Skip if this cell already has the same letter (intersection)
    if (grid[r][c].letter === word[i]) continue;

    // Get perpendicular pattern
    const pattern = getPerpendicularPattern(grid, r, c, direction, word[i]);
    if (pattern && !hasMatchingWord(pattern)) {
      return false;
    }
  }
  return true;
}

/**
 * Place a word in the grid
 */
function placeWord(
  grid: Cell[][],
  word: string,
  row: number,
  col: number,
  direction: Direction,
  clueNumber: number
): void {
  for (let i = 0; i < word.length; i++) {
    const r = direction === "ACROSS" ? row : row + i;
    const c = direction === "ACROSS" ? col + i : col;

    grid[r][c].letter = word[i];
    if (i === 0) {
      grid[r][c].number = clueNumber;
    }
  }
}

/**
 * Find positions where a word can intersect with existing words
 */
function findIntersections(
  grid: Cell[][],
  word: string
): { row: number; col: number; direction: Direction; intersectionCount: number }[] {
  const positions: { row: number; col: number; direction: Direction; intersectionCount: number }[] = [];

  // For each letter in the word, find matching letters in grid
  for (let wi = 0; wi < word.length; wi++) {
    const letter = word[wi];

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r][c].letter === letter) {
          // Try placing across (word letter at position wi intersects at (r, c))
          const acrossCol = c - wi;
          if (canPlaceWord(grid, word, r, acrossCol, "ACROSS")) {
            // Count how many intersections this placement creates
            let count = 0;
            for (let i = 0; i < word.length; i++) {
              if (grid[r][acrossCol + i].letter === word[i]) count++;
            }
            if (count > 0) {
              positions.push({ row: r, col: acrossCol, direction: "ACROSS", intersectionCount: count });
            }
          }

          // Try placing down
          const downRow = r - wi;
          if (canPlaceWord(grid, word, downRow, c, "DOWN")) {
            let count = 0;
            for (let i = 0; i < word.length; i++) {
              if (grid[downRow + i][c].letter === word[i]) count++;
            }
            if (count > 0) {
              positions.push({ row: downRow, col: c, direction: "DOWN", intersectionCount: count });
            }
          }
        }
      }
    }
  }

  // Remove duplicates
  const unique = new Map<string, typeof positions[0]>();
  for (const pos of positions) {
    const key = `${pos.row},${pos.col},${pos.direction}`;
    const existing = unique.get(key);
    if (!existing || pos.intersectionCount > existing.intersectionCount) {
      unique.set(key, pos);
    }
  }

  return Array.from(unique.values());
}

/**
 * Count filled cells in the grid
 */
function countFilledCells(grid: Cell[][]): number {
  let count = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].letter) count++;
    }
  }
  return count;
}

/**
 * Count intersections in the grid
 */
function countIntersections(grid: Cell[][]): number {
  let count = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].letter) {
        const hasHorizontalNeighbor =
          (c > 0 && grid[r][c - 1].letter) || (c < 4 && grid[r][c + 1].letter);
        const hasVerticalNeighbor =
          (r > 0 && grid[r - 1][c].letter) || (r < 4 && grid[r + 1][c].letter);
        if (hasHorizontalNeighbor && hasVerticalNeighbor) {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Score a completed grid
 */
function scoreGrid(
  grid: Cell[][],
  placedWords: PlacedWord[],
  totalWords: number
): number {
  let score = 0;

  // Word count (up to 40 points)
  score += Math.min(placedWords.length * 6, 40);

  // Intersections (up to 30 points)
  const intersections = countIntersections(grid);
  score += Math.min(intersections * 5, 30);

  // Fill density (up to 20 points)
  const filledCells = countFilledCells(grid);
  const fillPct = filledCells / 25;
  score += Math.floor(fillPct * 20);

  // Direction balance (up to 10 points)
  const across = placedWords.filter((w) => w.direction === "ACROSS").length;
  const down = placedWords.filter((w) => w.direction === "DOWN").length;
  if (across > 0 && down > 0) {
    const balance = Math.min(across, down) / Math.max(across, down);
    score += Math.floor(balance * 10);
  }

  return score;
}

/**
 * Try to generate a 5x5 puzzle with a specific black pattern
 */
function tryGenerate(
  words: WordInput[],
  pattern: [number, number][],
  maxAttempts: number = 30
): GenerationResult | null {
  // Sort words by length (longer first, as they're harder to place)
  const sortedWords = [...words].sort(
    (a, b) => b.activeSpelling.length - a.activeSpelling.length
  );

  const grid = createEmptyGrid();
  applyBlackPattern(grid, pattern);

  const placedWords: PlacedWord[] = [];
  const placedWordIds: string[] = [];
  const usedWords = new Set<string>();
  let clueNumber = 1;

  // Find a 5-letter word to start with (or longest available)
  let seedWord = sortedWords.find((w) => w.activeSpelling.length === 5);
  if (!seedWord) {
    seedWord = sortedWords[0];
  }

  if (!seedWord) return null;

  // Place seed word in row 0
  const seedSpelling = seedWord.activeSpelling.toUpperCase();
  const seedCol = Math.floor((5 - seedSpelling.length) / 2);

  if (!canPlaceWord(grid, seedSpelling, 0, seedCol, "ACROSS") ||
      !checkArcConsistency(grid, seedSpelling, 0, seedCol, "ACROSS")) {
    // Try other positions
    for (let c = 0; c <= 5 - seedSpelling.length; c++) {
      if (canPlaceWord(grid, seedSpelling, 0, c, "ACROSS") &&
          checkArcConsistency(grid, seedSpelling, 0, c, "ACROSS")) {
        placeWord(grid, seedSpelling, 0, c, "ACROSS", clueNumber);
        placedWords.push({
          word: seedSpelling,
          clue: seedWord.clue,
          row: 0,
          col: c,
          direction: "ACROSS",
          number: clueNumber,
        });
        placedWordIds.push(seedWord.id);
        usedWords.add(seedSpelling);
        clueNumber++;
        break;
      }
    }
  } else {
    placeWord(grid, seedSpelling, 0, seedCol, "ACROSS", clueNumber);
    placedWords.push({
      word: seedSpelling,
      clue: seedWord.clue,
      row: 0,
      col: seedCol,
      direction: "ACROSS",
      number: clueNumber,
    });
    placedWordIds.push(seedWord.id);
    usedWords.add(seedSpelling);
    clueNumber++;
  }

  if (placedWords.length === 0) return null;

  // Try to place remaining words
  let stuckCount = 0;
  const targetWords = Math.min(words.length, 8);

  while (placedWords.length < targetWords && stuckCount < maxAttempts) {
    let placed = false;

    // Shuffle remaining words for variety
    const remaining = sortedWords.filter(
      (w) => !usedWords.has(w.activeSpelling.toUpperCase())
    );

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    for (const wordInput of remaining) {
      const spelling = wordInput.activeSpelling.toUpperCase();
      const positions = findIntersections(grid, spelling);

      if (positions.length > 0) {
        // Sort by intersection count (more is better)
        positions.sort((a, b) => b.intersectionCount - a.intersectionCount);

        // Try top positions
        for (const pos of positions.slice(0, 5)) {
          if (canPlaceWord(grid, spelling, pos.row, pos.col, pos.direction) &&
              checkArcConsistency(grid, spelling, pos.row, pos.col, pos.direction)) {
            placeWord(grid, spelling, pos.row, pos.col, pos.direction, clueNumber);
            placedWords.push({
              word: spelling,
              clue: wordInput.clue,
              row: pos.row,
              col: pos.col,
              direction: pos.direction,
              number: clueNumber,
            });
            placedWordIds.push(wordInput.id);
            usedWords.add(spelling);
            clueNumber++;
            placed = true;
            break;
          }
        }

        if (placed) break;
      }
    }

    if (!placed) {
      stuckCount++;
    } else {
      stuckCount = 0;
    }
  }

  // Build result
  if (placedWords.length < 3) return null;

  const resultGrid = grid.map((row) =>
    row.map((cell) => {
      if (cell.isBlack) {
        return { type: "black" as const };
      } else if (cell.letter) {
        return {
          type: "letter" as const,
          solution: cell.letter,
          number: cell.number || undefined,
        };
      } else {
        return { type: "empty" as const };
      }
    })
  );

  // Calculate statistics
  const filledCells = countFilledCells(grid);
  const intersections = countIntersections(grid);
  const score = scoreGrid(grid, placedWords, words.length);

  const buildClueList = (direction: Direction) =>
    placedWords
      .filter((w) => w.direction === direction)
      .sort((a, b) => a.number - b.number)
      .map((w) => ({
        number: w.number,
        clue: w.clue,
        answer: w.word,
        row: w.row,
        col: w.col,
        length: w.word.length,
      }));

  const acrossClues = buildClueList("ACROSS");
  const downClues = buildClueList("DOWN");

  const unplacedWordIds = words
    .filter((w) => !usedWords.has(w.activeSpelling.toUpperCase()))
    .map((w) => w.id);

  return {
    success: true,
    grid: resultGrid,
    placedWords,
    placedWordIds,
    unplacedWordIds,
    clues: {
      across: acrossClues,
      down: downClues,
    },
    statistics: {
      gridFillPercentage: Math.round((filledCells / 25) * 100),
      wordPlacementRate: Math.round((placedWords.length / words.length) * 100),
      totalIntersections: intersections,
      avgIntersectionsPerWord:
        placedWords.length > 0
          ? Math.round((intersections / placedWords.length) * 10) / 10
          : 0,
      gridConnectivity: Math.round(
        (intersections / placedWords.length) * 10 +
          (filledCells / 25) * 20 +
          placedWords.length * 2
      ),
      totalCells: 25,
      filledCells,
      placedWordCount: placedWords.length,
      totalWordCount: words.length,
    },
    score,
  };
}

/**
 * Generate a 5x5 crossword puzzle
 *
 * Tries multiple black patterns and returns the best result
 */
export const generate5x5 = action({
  args: {
    words: v.array(
      v.object({
        id: v.string(),
        word: v.string(),
        clue: v.string(),
        activeSpelling: v.string(),
      })
    ),
    targetWords: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { words, targetWords = 6, maxAttempts = 50 } = args;

    // Filter words to 5 letters or less
    const validWords = words.filter((w) => w.activeSpelling.length <= 5);

    if (validWords.length < 3) {
      return {
        success: false,
        error: "Need at least 3 words (5 letters or less) to generate a puzzle",
      };
    }

    let bestResult: GenerationResult | null = null;
    let bestScore = 0;

    // Try each pattern multiple times
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const patternIndex = attempt % BLACK_PATTERNS.length;
      const pattern = BLACK_PATTERNS[patternIndex];

      const result = tryGenerate(validWords, pattern, 30);

      if (result && result.score > bestScore) {
        bestResult = result;
        bestScore = result.score;

        // Good enough? Stop early
        if (
          result.placedWords.length >= targetWords &&
          result.statistics.gridFillPercentage >= 60 &&
          bestScore >= 70
        ) {
          break;
        }
      }
    }

    if (!bestResult) {
      return {
        success: false,
        error: "Failed to generate a valid puzzle. Try different words.",
      };
    }

    return bestResult;
  },
});
