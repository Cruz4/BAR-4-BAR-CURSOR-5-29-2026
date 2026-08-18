/**
 * Refill scene neon corpus glosses with complete dictionary definitions.
 * Primary: Free Dictionary API. Fallback: Datamuse. Then curated / safe fallback.
 * Run: node scripts/refill-scene-neon-definitions.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = join(__dirname, '../src/lib/scene/scene-neon-lexicon-corpus.ts');
const CACHE_PATH = join(__dirname, 'scene-neon-definitions-cache.json');
const CACHE_VERSION = 3;

/** Hand defs for craft / foreign / compound words dictionaries often miss. */
const CURATED = {
  caesura: 'A pause or break in a line of verse.',
  enjambment: 'A sentence that runs past the end of a line.',
  volta: 'The turn or shift in a poem’s argument.',
  strophe: 'A structural stanza or verse unit.',
  sestina: 'A poem of six six-line stanzas with repeating end-words.',
  villanelle: 'A nineteen-line poem with two repeating refrains.',
  quatrain: 'A four-line stanza.',
  couplet: 'Two successive rhyming lines.',
  tercet: 'A three-line stanza or group.',
  hemistich: 'A half-line of verse.',
  catalexis: 'An incomplete final foot in a metrical line.',
  elision: 'Omitting a sound or syllable in speech or verse.',
  anaphora: 'Repeating a word or phrase at the start of lines.',
  epistrophe: 'Repeating a word or phrase at the end of clauses.',
  chiasmus: 'A mirrored ABBA pattern of words or ideas.',
  zeugma: 'One word governing two others in different senses.',
  metonymy: 'Naming something by a closely related thing.',
  synecdoche: 'Using a part to stand for the whole.',
  litotes: 'Understatement by negating the opposite.',
  prosody: 'The patterns of rhythm and sound in verse.',
  scansion: 'Marking the meter of a line of verse.',
  dactyl: 'A metrical foot: stressed then two unstressed.',
  spondee: 'A metrical foot of two stressed syllables.',
  trochee: 'A metrical foot: stressed then unstressed.',
  iamb: 'A metrical foot: unstressed then stressed.',
  anapest: 'A metrical foot: two unstressed then stressed.',
  hexameter: 'A line of verse with six metrical feet.',
  pentameter: 'A line of verse with five metrical feet.',
  tetrameter: 'A line of verse with four metrical feet.',
  trimeter: 'A line of verse with three metrical feet.',
  dimeter: 'A line of verse with two metrical feet.',
  monometer: 'A line of verse with one metrical foot.',
  alexandrine: 'A twelve-syllable line of verse.',
  freeverse: 'Verse without a fixed meter or rhyme scheme.',
  blankverse: 'Unrhymed iambic pentameter.',
  threnody: 'A song or poem of mourning.',
  paean: 'A song of praise or triumph.',
  jeremiad: 'A long lament of woe or complaint.',
  palimpsest: 'A surface rewritten so older layers still show.',
  incipit: 'The opening words of a text.',
  excipit: 'The closing words of a text.',
  colophon: 'A publisher’s emblem or end note in a book.',
  epigraph: 'A short quotation set at the start of a work.',
  leitmotif: 'A recurring theme tied to an idea or character.',
  nocturne: 'A dreamy piece evocative of night.',
  timbre: 'The tone color that makes a sound unique.',
  anacrusis: 'The pickup notes before the first downbeat.',
  polyphony: 'Multiple independent melodic lines at once.',
  assonance: 'Repetition of vowel sounds in nearby words.',
  syncopation: 'Accenting a normally weak beat.',
  ostinato: 'A short musical figure repeated insistently.',
  cadence: 'A melodic or harmonic close; also speech rhythm.',
  rubato: 'Flexible tempo that stretches and compresses time.',
  melisma: 'Several notes sung on one syllable.',
  counterpoint: 'Interwoven independent melodic lines.',
  tessitura: 'The comfortable pitch range of a voice or part.',
  parlando: 'Spoken or speech-like singing.',
  legato: 'Smoothly connected notes.',
  staccato: 'Short, detached notes.',
  pizzicato: 'Plucking strings instead of bowing.',
  vibrato: 'A slight, rapid pitch waver for warmth.',
  glissando: 'A continuous slide between pitches.',
  fermata: 'A pause held longer than the written value.',
  crescendo: 'A gradual increase in loudness.',
  diminuendo: 'A gradual decrease in loudness.',
  fortissimo: 'Very loud.',
  pianissimo: 'Very soft.',
  ritardando: 'Gradually slowing the tempo.',
  accelerando: 'Gradually speeding the tempo.',
  sforzando: 'A sudden strong accent on a note.',
  arpeggio: 'Chord tones played in succession, not together.',
  polyrhythm: 'Two or more conflicting rhythms at once.',
  sonder: 'The sense that strangers live rich inner lives.',
  petrichor: 'The earthy scent after rain on dry ground.',
  hiraeth: 'Homesickness for a place you can’t return to.',
  saudade: 'A deep longing for something absent.',
  liminal: 'In-between; on a threshold of change.',
  afterglow: 'Light or feeling that lingers after something ends.',
  afterhours: 'The time after closing; late-night hours.',
  witchinghour: 'The deepest hour of night, often midnight.',
  latenight: 'Belonging to the late hours of night.',
  lastcall: 'The final chance to order before closing.',
  closingtime: 'The hour a venue shuts for the night.',
  lasttrain: 'The final train of the night.',
  fireescape: 'An outdoor stairway for emergency exit.',
  nightowl: 'Someone who stays up and active late.',
  crossrhythm: 'Rhythms that cut across the main pulse.',
  downbeat: 'The first, strongest beat of a measure.',
  upbeat: 'An unaccented beat leading into a downbeat.',
  backbeat: 'A strong accent on beats two and four.',
  throughline: 'The continuous narrative thread of a piece.',
  looseend: 'An unresolved detail left hanging.',
  punchline: 'The payoff line that lands the joke or bar.',
  multisyllabic: 'Using rhymes that span multiple syllables.',
  humblebrag: 'A boast disguised as modesty.',
  throwup: 'A quick, sketched graffiti piece.',
  highbeam: 'Bright headlights used for distant vision.',
  deadbolt: 'A lock bolt moved by a key or thumbturn.',
  payphone: 'A public telephone operated with coins or cards.',
  dialtone: 'The hum that means a phone line is ready.',
  verdigris: 'The green patina that forms on copper.',
  komorebi: 'Sunlight filtering through leaves.',
  fernweh: 'An ache to travel to far places.',
  weltschmerz: 'World-weariness; sadness at how life is.',
  sehnsucht: 'Intense yearning for something undefined.',
  torschlusspanik: 'Fear that a door of opportunity is closing.',
  schadenfreude: 'Pleasure at someone else’s misfortune.',
  zeitgeist: 'The defining spirit of an era.',
  weltanschauung: 'A comprehensive worldview.',
  doppelganger: 'A double or look-alike of a person.',
  anagnorisis: 'The moment of critical discovery in a story.',
  peripeteia: 'A sudden reversal of fortune.',
  hamartia: 'A tragic flaw that brings a hero down.',
  syzygy: 'An alignment of celestial bodies.',
  duende: 'Raw soulful spirit in art or performance.',
  yugen: 'A profound, mysterious sense of beauty.',
  ikigai: 'A reason for being; what makes life worth living.',
  hygge: 'Cozy contentment and comfortable warmth.',
  lagom: 'Just the right amount; balanced moderation.',
  ubuntu: 'Humanity toward others; I am because we are.',
  wabi: 'Beauty in the imperfect and incomplete.',
  sabi: 'Beauty that comes with age and wear.',
  mono: 'Awareness of the fleeting nature of things.',
  aware: 'A gentle sadness at life’s impermanence.',
  vesper: 'Evening; an evening prayer or star.',
  ephemera: 'Things lasting only a short time.',
  umbra: 'The darkest part of a shadow.',
  penumbra: 'The partial shadow at an eclipse’s edge.',
  inkwell: 'A small pot that holds writing ink.',
  bistromath: 'Playful math invented for cafe napkin theories.',
  simmer: 'To cook gently just below boiling; also, to build quietly.',
  absinthe: 'A bitter green spirit flavored with wormwood.',
  always: 'At all times; on every occasion.',
  aroma: 'A distinctive, usually pleasant smell.',
  chrono: 'Relating to time; a time-based prefix.',
  gradually: 'Happening slowly, step by step.',
  hushed: 'Quiet; silenced or spoken softly.',
  instead: 'As an alternative or substitute.',
  neither: 'Not one and not the other.',
  overdue: 'Past the time when due.',
  rarely: 'Not often; seldom.',
  somehow: 'In some way not yet known.',
  suddenly: 'Quickly and without warning.',
  twice: 'Two times; on two occasions.',
  whether: 'Expressing a choice between alternatives.',
  whose: 'Belonging to which person.',
  without: 'Not having; in the absence of.',
  ache: 'A continuous dull pain; also a longing.',
  distract: 'To pull attention away from something.',
  declaim: 'To speak or recite rhetorically.',
  counter: 'A surface for serving; also, to oppose.',
  aegis: 'Protection, support, or sponsorship.',
  forget: 'To fail to remember.',
  function: 'The purpose or role something serves.',
  giraffe: 'A very tall African mammal with a long neck.',
  ignore: 'To refuse to notice or pay attention to.',
  modify: 'To change partly rather than completely.',
  peasant: 'A rural farm worker or laborer.',
  penguin: 'A flightless seabird of the Southern Hemisphere.',
  problem: 'A matter that is difficult to solve or deal with.',
  replace: 'To take the place of something else.',
  reputation: 'The general opinion people have about someone or something.',
  samsara: 'The cycle of death and rebirth in some Eastern religions.',
  satire: 'The use of humor or exaggeration to expose folly.',
  simulate: 'To imitate the appearance or behavior of something.',
  south: 'The direction opposite north.',
  spleen: 'An organ that filters blood and supports the immune system.',
  sulfur: 'A yellow chemical element often associated with a sharp smell.',
  theory: 'An explanation supported by observation, reasoning, or evidence.',
  trunk: 'The main stem of a tree.',
};

function queryWord(entryWord, id) {
  return (entryWord || id || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function cacheKey(q) {
  return q.replace(/\s+/g, '');
}

function isIncompleteGloss(s) {
  const t = String(s || '').trim();
  if (!t || t === '__MISS__') return true;
  if (/^short take:/i.test(t)) return true;
  if (/…|\.\.\.$/.test(t)) return true;
  // Mid-cut teasers often lack terminal punctuation and end on a dangling article/preposition.
  if (/\b(a|an|the|to|of|or|and|by|for|with|in|on|from|into|as|so)$/i.test(t.replace(/[.!?]+$/, ''))) {
    return true;
  }
  return false;
}

function shorten(s) {
  let out = String(s || '').replace(/\s+/g, ' ').trim();
  // Prefer first full sentence.
  const cut = out.match(/^[^.!?]+[.!?]?/);
  out = (cut ? cut[0] : out).trim();
  // Drop trailing parenthetical junk when the core is long enough.
  if (out.length > 40) out = out.replace(/\s*\([^)]*\)\s*$/, '').trim();
  out = out.replace(/[\s.…]+$/u, '').replace(/[.!?]+$/u, '').trim();

  const maxLen = 200;
  if (out.length > maxLen) {
    let slice = out.slice(0, maxLen);
    const space = slice.lastIndexOf(' ');
    if (space > maxLen * 0.5) slice = slice.slice(0, space);
    out = slice.trim();
  }

  out = out.replace(/[,:;–—\-(\[{]+\s*$/u, '').trim();
  if (!out) return '';
  if (!/[.!?]$/.test(out)) out = `${out}.`;
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

function isBadDef(s) {
  const lower = s.toLowerCase();
  return (
    lower.length < 12 ||
    /short take:|steal it for a bar|surname|placename|university|video game|the sims|\(slang\)|vulgar|offensive|trademark|a testicle|group of clowns|debeige|parsley\.?$|butter\.?$|gait\.?$|antiphon\.?$|anaemic\.?$|didgeridoo|worldly sailor|a husband\.?$|a bank\.?$|a mug\.?$|ugly\.?$|a dessert\.?$|a love interest\.?$|second mowing|a placename/i.test(
      lower
    )
  );
}

async function fetchFreeDictionary(word) {
  const q = encodeURIComponent(word.replace(/\s+/g, ' '));
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${q}`);
  if (!res.ok) return null;
  const json = await res.json();
  if (!Array.isArray(json) || !json[0]?.meanings?.length) return null;

  const preferredPos = ['noun', 'adjective', 'verb', 'adverb'];
  const meanings = [...json[0].meanings].sort((a, b) => {
    const ai = preferredPos.indexOf(a.partOfSpeech);
    const bi = preferredPos.indexOf(b.partOfSpeech);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const meaning of meanings) {
    for (const def of meaning.definitions || []) {
      const cleaned = shorten(def.definition);
      if (cleaned && !isBadDef(cleaned)) return cleaned;
    }
  }
  return null;
}

function pickDatamuseDef(defs) {
  if (!Array.isArray(defs) || !defs.length) return null;
  const scored = defs.map((d) => {
    const lower = d.toLowerCase();
    let score = 0;
    if (lower.startsWith('n\t')) score += 4;
    if (lower.startsWith('adj\t') || lower.startsWith('a\t')) score += 3;
    if (lower.startsWith('v\t')) score += 2;
    if (lower.includes('figurative')) score += 1;
    if (
      /surname|placename|university|video game|the sims|vulgar|offensive|obsolete|trademark/.test(
        lower
      )
    ) {
      score -= 10;
    }
    const cleaned = shorten(d.replace(/^[a-z]+\t/i, ''));
    if (isBadDef(cleaned)) score -= 8;
    return { cleaned, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored.find((s) => s.score > 0 && s.cleaned && !isBadDef(s.cleaned));
  return best?.cleaned || null;
}

async function fetchDatamuse(word) {
  const q = encodeURIComponent(word);
  const res = await fetch(`https://api.datamuse.com/words?sp=${q}&md=d&max=1`);
  if (!res.ok) return null;
  const json = await res.json();
  const hit = Array.isArray(json) ? json[0] : null;
  if (!hit?.defs?.length) return null;
  return pickDatamuseDef(hit.defs);
}

async function fetchDef(word) {
  const primary = await fetchFreeDictionary(word);
  if (primary) return primary;
  if (word.includes(' ')) {
    const nospace = await fetchFreeDictionary(word.replace(/\s+/g, ''));
    if (nospace) return nospace;
  }
  const dm = await fetchDatamuse(word);
  if (dm) return dm;
  if (word.includes(' ')) return fetchDatamuse(word.replace(/\s+/g, ''));
  return null;
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) return { v: CACHE_VERSION, defs: {} };
  try {
    const raw = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
    if (raw?.defs && typeof raw.defs === 'object') {
      // Keep prior defs across version bumps; incomplete rows are refetched.
      return { v: CACHE_VERSION, defs: raw.defs };
    }
  } catch {
    /* ignore */
  }
  return { v: CACHE_VERSION, defs: {} };
}

function parseCorpus(src) {
  const re =
    /\{\s*id:\s*"([^"]+)"\s*,\s*word:\s*"([^"]+)"\s*,\s*pron:\s*"([^"]+)"\s*,\s*gloss:\s*"((?:\\.|[^"\\])*)"\s*\}/g;
  const entries = [];
  let m;
  while ((m = re.exec(src))) {
    entries.push({
      id: m[1],
      word: m[2],
      pron: m[3],
      gloss: m[4].replace(/\\"/g, '"'),
    });
  }
  return entries;
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

async function main() {
  const src = readFileSync(CORPUS_PATH, 'utf8');
  const entries = parseCorpus(src);
  if (!entries.length) throw new Error('No corpus entries parsed');

  const cache = loadCache();
  let fetched = 0;
  let missed = 0;

  const needs = entries.filter((e) => {
    const q = queryWord(e.word, e.id);
    const key = cacheKey(q);
    if (CURATED[e.id] || CURATED[key] || CURATED[q]) return false;
    const hit = cache.defs[key];
    if (hit && hit !== '__MISS__' && !isBadDef(hit) && !isIncompleteGloss(hit)) return false;
    // Also refetch if corpus still has a teaser ellipsis even when cache looks fine.
    if (isIncompleteGloss(e.gloss)) return true;
    return !hit || hit === '__MISS__' || isBadDef(hit) || isIncompleteGloss(hit);
  });

  console.log(`Corpus: ${entries.length} words; fetching ${needs.length} defs…`);

  await mapPool(needs, 5, async (e) => {
    const q = queryWord(e.word, e.id);
    const key = cacheKey(q);
    try {
      const def = await fetchDef(q);
      cache.defs[key] = def && !isBadDef(def) ? def : '__MISS__';
      if (cache.defs[key] !== '__MISS__') fetched++;
      else missed++;
      if ((fetched + missed) % 40 === 0) {
        writeFileSync(CACHE_PATH, JSON.stringify(cache));
        console.log(`  progress ${fetched + missed}/${needs.length} (ok ${fetched}, miss ${missed})`);
      }
    } catch {
      cache.defs[key] = '__MISS__';
      missed++;
    }
  });

  writeFileSync(CACHE_PATH, JSON.stringify(cache));

  const fallback = (word) => `${word} in the Bar 4 Bar neon lexicon.`;

  const next = entries.map((e) => {
    const q = queryWord(e.word, e.id);
    const key = cacheKey(q);
    const cached = cache.defs[key];
    const gloss =
      CURATED[e.id] ||
      CURATED[key] ||
      CURATED[q] ||
      (cached &&
      cached !== '__MISS__' &&
      !isBadDef(cached) &&
      !isIncompleteGloss(cached)
        ? cached
        : null) ||
      fallback(e.word);
    return { ...e, gloss };
  });

  const body = next
    .map(
      (e) =>
        `  { id: "${esc(e.id)}", word: "${esc(e.word)}", pron: "${esc(e.pron)}", gloss: "${esc(e.gloss)}" },`
    )
    .join('\n');

  writeFileSync(
    CORPUS_PATH,
    `/** Auto-generated by scripts/generate-scene-neon-corpus.mjs + refill-scene-neon-definitions.mjs — do not edit by hand. */\n\nexport const SCENE_NEON_CORPUS = [\n${body}\n];\n`
  );

  const withReal = next.filter((e) => !e.gloss.startsWith('Short take:')).length;
  console.log(`Done. Real defs: ${withReal}/${next.length}.`);
  console.log(`Simmer → ${next.find((e) => e.id === 'simmer')?.gloss}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
