/**
 * Deterministic phonetics for lyric comprehension.
 *
 * Word -> ARPABET phones via the CMU pronouncing dictionary (loaded lazily,
 * server-side) with a grapheme-to-phoneme heuristic fallback for slang and
 * out-of-vocabulary words common in rap (e.g. "flexin", "brazy").
 *
 * The heuristic path is synchronous and dependency-free so this module can
 * run anywhere; call `loadPhoneticDictionary()` first (server) for accuracy.
 */

export type PhoneticSource = 'dictionary' | 'heuristic';

export type WordPhonetics = {
  word: string;
  /** ARPABET phones, vowels carry stress digits (e.g. "AH0", "EY1"). */
  phones: string[];
  syllables: number;
  source: PhoneticSource;
};

export type PhoneticSyllable = {
  onset: string[];
  /** Vowel phone without stress digit (e.g. "EY"). */
  nucleus: string;
  stress: number;
  coda: string[];
};

const ARPABET_VOWELS = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW',
]);

let cmuDict: Record<string, string> | null = null;
let dictLoadPromise: Promise<void> | null = null;

/** Lazily load the CMU dictionary (~134k words). Safe to call repeatedly. */
export async function loadPhoneticDictionary(): Promise<void> {
  if (cmuDict) return;
  if (!dictLoadPromise) {
    dictLoadPromise = import('cmu-pronouncing-dictionary')
      .then((mod) => {
        cmuDict = mod.dictionary;
      })
      .catch((err) => {
        dictLoadPromise = null;
        console.warn('[lyrics-analysis] CMU dictionary unavailable, using heuristics only:', err);
      });
  }
  await dictLoadPromise;
}

export function isPhoneticDictionaryLoaded(): boolean {
  return cmuDict !== null;
}

/** Test seam / alternate dictionary injection. */
export function setPhoneticDictionary(dict: Record<string, string> | null): void {
  cmuDict = dict;
}

export function isVowelPhone(phone: string): boolean {
  return ARPABET_VOWELS.has(stripStress(phone));
}

export function stripStress(phone: string): string {
  return phone.replace(/[0-2]$/, '');
}

export function phoneStress(phone: string): number {
  const m = phone.match(/([0-2])$/);
  return m ? Number(m[1]) : -1;
}

/** Lowercase and strip everything that is not a letter, digit or apostrophe. */
export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9']/g, '')
    .replace(/^'+|'+$/g, '');
}

/** Split a lyric line into normalized word tokens. */
export function tokenizeLine(line: string): string[] {
  return line
    .split(/\s+/)
    .map(normalizeWord)
    .filter((w) => w.length > 0);
}

function lookupDictionary(word: string): string | undefined {
  if (!cmuDict) return undefined;
  const direct = cmuDict[word];
  if (direct) return direct;
  // Rap-friendly variants: flexin -> flexing, runnin' -> running.
  if (word.endsWith("in'") || word.endsWith('in')) {
    const base = word.replace(/in'?$/, 'ing');
    if (cmuDict[base]) return cmuDict[base];
  }
  // Possessives / contractions: money's -> money.
  if (word.endsWith("'s")) {
    const base = word.slice(0, -2);
    if (cmuDict[base]) {
      const phones = cmuDict[base];
      return `${phones} Z`;
    }
  }
  // Simple plural: whips -> whip.
  if (word.endsWith('s') && word.length > 3) {
    const base = word.slice(0, -1);
    if (cmuDict[base]) return `${cmuDict[base]} Z`;
  }
  return undefined;
}

export function getWordPhonetics(rawWord: string): WordPhonetics {
  const word = normalizeWord(rawWord);
  if (!word) return { word: '', phones: [], syllables: 0, source: 'heuristic' };

  const entry = lookupDictionary(word);
  if (entry) {
    const phones = entry.trim().split(/\s+/);
    return {
      word,
      phones,
      syllables: phones.filter(isVowelPhone).length,
      source: 'dictionary',
    };
  }
  const phones = heuristicPhones(word);
  return {
    word,
    phones,
    syllables: Math.max(1, phones.filter(isVowelPhone).length),
    source: 'heuristic',
  };
}

/** Group an ARPABET phone sequence into syllables around vowel nuclei. */
export function syllabify(phones: string[]): PhoneticSyllable[] {
  const syllables: PhoneticSyllable[] = [];
  let onset: string[] = [];
  for (const phone of phones) {
    if (isVowelPhone(phone)) {
      syllables.push({ onset, nucleus: stripStress(phone), stress: Math.max(0, phoneStress(phone)), coda: [] });
      onset = [];
    } else if (syllables.length === 0) {
      onset.push(stripStress(phone));
    } else {
      // Attach consonants to previous coda for now; steal one back as the
      // next onset if another vowel follows (handled below).
      syllables[syllables.length - 1].coda.push(stripStress(phone));
    }
  }
  // Onset maximization (simple): move the final coda consonant of a syllable
  // to the onset of the following syllable.
  for (let i = 0; i < syllables.length - 1; i++) {
    const coda = syllables[i].coda;
    if (coda.length > 0) {
      const moved = coda.pop()!;
      syllables[i + 1].onset.unshift(moved);
    }
  }
  return syllables;
}

// --- Heuristic grapheme-to-phoneme fallback -------------------------------

type G2pRule = { match: RegExp; phones: string[] };

/** Ordered digraph/letter rules; scanned longest-match-first at each position. */
const G2P_RULES: G2pRule[] = [
  { match: /^tch/, phones: ['CH'] },
  { match: /^ch/, phones: ['CH'] },
  { match: /^sh/, phones: ['SH'] },
  { match: /^th/, phones: ['TH'] },
  { match: /^ph/, phones: ['F'] },
  { match: /^wh/, phones: ['W'] },
  { match: /^ck/, phones: ['K'] },
  { match: /^ng/, phones: ['NG'] },
  { match: /^qu/, phones: ['K', 'W'] },
  { match: /^dge/, phones: ['JH'] },
  { match: /^igh/, phones: ['AY1'] },
  { match: /^eigh/, phones: ['EY1'] },
  { match: /^ought/, phones: ['AO1', 'T'] },
  { match: /^tion/, phones: ['SH', 'AH0', 'N'] },
  { match: /^sion/, phones: ['ZH', 'AH0', 'N'] },
  { match: /^ould/, phones: ['UH1', 'D'] },
  { match: /^oo/, phones: ['UW1'] },
  { match: /^ee/, phones: ['IY1'] },
  { match: /^ea/, phones: ['IY1'] },
  { match: /^ai/, phones: ['EY1'] },
  { match: /^ay/, phones: ['EY1'] },
  { match: /^ey/, phones: ['EY1'] },
  { match: /^oa/, phones: ['OW1'] },
  { match: /^ow/, phones: ['AW1'] },
  { match: /^ou/, phones: ['AW1'] },
  { match: /^oi/, phones: ['OY1'] },
  { match: /^oy/, phones: ['OY1'] },
  { match: /^au/, phones: ['AO1'] },
  { match: /^aw/, phones: ['AO1'] },
  { match: /^ew/, phones: ['UW1'] },
  { match: /^ie/, phones: ['IY1'] },
  { match: /^ar/, phones: ['AA1', 'R'] },
  { match: /^or/, phones: ['AO1', 'R'] },
  { match: /^er/, phones: ['ER0'] },
  { match: /^ir/, phones: ['ER1'] },
  { match: /^ur/, phones: ['ER1'] },
  { match: /^a/, phones: ['AE1'] },
  { match: /^e/, phones: ['EH1'] },
  { match: /^i/, phones: ['IH1'] },
  { match: /^o/, phones: ['AA1'] },
  { match: /^u/, phones: ['AH1'] },
  { match: /^y/, phones: ['IY0'] }, // vowel y (consonant y handled positionally)
  { match: /^b/, phones: ['B'] },
  { match: /^c/, phones: ['K'] },
  { match: /^d/, phones: ['D'] },
  { match: /^f/, phones: ['F'] },
  { match: /^g/, phones: ['G'] },
  { match: /^h/, phones: ['HH'] },
  { match: /^j/, phones: ['JH'] },
  { match: /^k/, phones: ['K'] },
  { match: /^l/, phones: ['L'] },
  { match: /^m/, phones: ['M'] },
  { match: /^n/, phones: ['N'] },
  { match: /^p/, phones: ['P'] },
  { match: /^r/, phones: ['R'] },
  { match: /^s/, phones: ['S'] },
  { match: /^t/, phones: ['T'] },
  { match: /^v/, phones: ['V'] },
  { match: /^w/, phones: ['W'] },
  { match: /^x/, phones: ['K', 'S'] },
  { match: /^z/, phones: ['Z'] },
  { match: /^'/, phones: [] },
  { match: /^[0-9]/, phones: [] },
];

function heuristicPhones(word: string): string[] {
  let rest = word;

  // Soft c/g before e/i/y.
  rest = rest.replace(/c(?=[eiy])/g, 's').replace(/g(?=[eiy])(?!g)/g, 'j');

  // Silent trailing e ("game" -> gam + long a approximated after the fact).
  const silentE = /[a-z][b-df-hj-np-tv-z]e$/.test(rest) && !rest.endsWith('le');

  const phones: string[] = [];
  let i = 0;
  while (i < rest.length) {
    const slice = rest.slice(i);
    // Consonant y at word start ("young").
    if (i === 0 && slice[0] === 'y' && rest.length > 1 && /[aeiou]/.test(rest[1])) {
      phones.push('Y');
      i += 1;
      continue;
    }
    let matched = false;
    for (const rule of G2P_RULES) {
      const m = slice.match(rule.match);
      if (m) {
        phones.push(...rule.phones);
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) i += 1;
  }

  // Silent-e lengthens the previous vowel: gam(e) AE -> EY, tim(e) IH -> AY, hop(e) AA -> OW, cut(e) AH -> UW.
  if (silentE) {
    for (let j = phones.length - 1; j >= 0; j--) {
      if (isVowelPhone(phones[j])) {
        const stress = Math.max(0, phoneStress(phones[j]));
        const base = stripStress(phones[j]);
        const lengthened: Record<string, string> = { AE: 'EY', IH: 'AY', AA: 'OW', AH: 'UW', EH: 'IY' };
        if (lengthened[base]) phones[j] = `${lengthened[base]}${stress}`;
        break;
      }
    }
    // Drop the trailing EH from the silent e if it was emitted.
    const last = phones[phones.length - 1];
    if (last && stripStress(last) === 'EH') phones.pop();
  }

  // Collapse duplicate consecutive phones (double letters).
  const collapsed: string[] = [];
  for (const p of phones) {
    if (collapsed.length && collapsed[collapsed.length - 1] === p && !isVowelPhone(p)) continue;
    collapsed.push(p);
  }

  if (!collapsed.some(isVowelPhone) && word.length > 0) collapsed.push('AH0');
  return collapsed;
}
