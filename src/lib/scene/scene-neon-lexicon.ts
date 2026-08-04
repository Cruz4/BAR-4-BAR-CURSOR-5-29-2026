/**
 * Scene skyline neon lexicon — one word + short gloss per visit.
 * Craft / night / writing vocabulary; not product labels (Scene, Block, Vault).
 */

export type SceneNeonEntry = {
  id: string;
  word: string;
  /** Simplified phonetic pronunciation, e.g. "sih-ZHUR-uh". */
  pron: string;
  gloss: string;
};

export const SCENE_NEON_LEXICON: SceneNeonEntry[] = [
  { id: 'caesura', word: 'Caesura', pron: 'sih-ZHUR-uh', gloss: 'A pause that shapes the line.' },
  { id: 'cipher', word: 'Cipher', pron: 'SY-fer', gloss: 'A freestyle circle; bars in the round.' },
  { id: 'nocturne', word: 'Nocturne', pron: 'NOK-turn', gloss: 'Music made for the night.' },
  { id: 'enjambment', word: 'Enjambment', pron: 'en-JAM-ment', gloss: 'Meaning that runs past the break.' },
  { id: 'leitmotif', word: 'Leitmotif', pron: 'LYT-moh-teef', gloss: 'A theme that keeps returning.' },
  { id: 'prosody', word: 'Prosody', pron: 'PROSS-uh-dee', gloss: 'The music inside speech.' },
  { id: 'timbre', word: 'Timbre', pron: 'TAM-ber', gloss: 'The color of a sound.' },
  { id: 'anacrusis', word: 'Anacrusis', pron: 'an-uh-KROO-sis', gloss: 'The pickup before the downbeat.' },
  { id: 'polyphony', word: 'Polyphony', pron: 'puh-LIF-uh-nee', gloss: 'Many voices, one weave.' },
  { id: 'strophe', word: 'Strophe', pron: 'STROH-fee', gloss: 'A turn of the verse.' },
  { id: 'assonance', word: 'Assonance', pron: 'ASS-uh-nunss', gloss: 'Vowels echoing across words.' },
  { id: 'syncopation', word: 'Syncopation', pron: 'sing-kuh-PAY-shun', gloss: 'Stress where you least expect it.' },
  { id: 'ostinato', word: 'Ostinato', pron: 'os-tih-NAH-toh', gloss: 'A figure that refuses to leave.' },
  { id: 'cadence', word: 'Cadence', pron: 'KAY-dunss', gloss: 'How a phrase comes to rest.' },
  { id: 'sotto', word: 'Sotto', pron: 'SOT-toh', gloss: 'Spoken under the breath.' },
  { id: 'rubato', word: 'Rubato', pron: 'roo-BAH-toh', gloss: 'Time bent for feel.' },
  { id: 'motif', word: 'Motif', pron: 'moh-TEEF', gloss: 'A small idea with gravity.' },
  { id: 'refrain', word: 'Refrain', pron: 'rih-FRAYN', gloss: 'The line that comes back.' },
  { id: 'volta', word: 'Volta', pron: 'VOL-tuh', gloss: 'The turn that changes the poem.' },
  { id: 'melisma', word: 'Melisma', pron: 'muh-LIZ-muh', gloss: 'One syllable stretched into song.' },
  { id: 'counterpoint', word: 'Counterpoint', pron: 'KOWN-ter-point', gloss: 'Lines that argue in harmony.' },
  { id: 'ephemera', word: 'Ephemera', pron: 'ih-FEM-er-uh', gloss: 'What only lasts a night.' },
  { id: 'sonder', word: 'Sonder', pron: 'SAHN-der', gloss: 'Realizing every stranger has a full life.' },
  { id: 'liminal', word: 'Liminal', pron: 'LIM-in-ul', gloss: 'The doorway between states.' },
  { id: 'vesper', word: 'Vesper', pron: 'VESS-per', gloss: 'Evening; a late prayer of sound.' },
  { id: 'hushed', word: 'Hushed', pron: 'huhsht', gloss: 'Quiet on purpose.' },
  { id: 'afterglow', word: 'Afterglow', pron: 'AF-ter-gloh', gloss: 'Light that stays when the show ends.' },
  { id: 'blueprint', word: 'Blueprint', pron: 'BLOO-print', gloss: 'The plan under the paint.' },
  { id: 'residue', word: 'Residue', pron: 'REZ-ih-doo', gloss: 'What a session leaves behind.' },
  { id: 'incipit', word: 'Incipit', pron: 'in-SIP-it', gloss: 'The first words of a work.' },
  { id: 'coda', word: 'Coda', pron: 'KOH-duh', gloss: 'The last turn after the end.' },
  { id: 'tessitura', word: 'Tessitura', pron: 'tess-ih-TOOR-uh', gloss: 'Where a voice lives most naturally.' },
  { id: 'parlando', word: 'Parlando', pron: 'par-LAHN-doh', gloss: 'Sung as if spoken.' },
  { id: 'aria', word: 'Aria', pron: 'AH-ree-uh', gloss: 'A solo that claims the air.' },
  { id: 'murmur', word: 'Murmur', pron: 'MUR-mer', gloss: 'Soft speech that still carries.' },
  { id: 'glimmer', word: 'Glimmer', pron: 'GLIM-er', gloss: 'A brief, low light.' },
  { id: 'orbit', word: 'Orbit', pron: 'OR-bit', gloss: 'A path you keep returning on.' },
  { id: 'inkwell', word: 'Inkwell', pron: 'INK-well', gloss: 'Where the next line waits.' },
  { id: 'margin', word: 'Margin', pron: 'MAR-jin', gloss: 'The quiet space beside the text.' },
  { id: 'echo', word: 'Echo', pron: 'EK-oh', gloss: 'A sound that answers itself.' },
];

const RECENT_KEY = 'b4b-scene-neon-recent';
const RECENT_LIMIT = 18;

function readRecentIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function writeRecentIds(ids: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, RECENT_LIMIT)));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Pick a lexicon entry, avoiding the last ~18 shown when possible. */
export function pickSceneNeonEntry(rng: () => number = Math.random): SceneNeonEntry {
  const recent = readRecentIds();
  const fresh = SCENE_NEON_LEXICON.filter((e) => !recent.includes(e.id));
  const pool = fresh.length > 0 ? fresh : SCENE_NEON_LEXICON;
  const entry = pool[Math.floor(rng() * pool.length)] ?? SCENE_NEON_LEXICON[0]!;
  writeRecentIds([entry.id, ...recent.filter((id) => id !== entry.id)]);
  return entry;
}
