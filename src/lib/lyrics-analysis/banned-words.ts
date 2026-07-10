/**
 * Hard banned-word enforcement.
 *
 * Guardrails were previously prompt-only ("please don't use these words") —
 * nothing validated AI output. This module gives the server a deterministic
 * post-check: normalization (case, punctuation, plurals) plus basic
 * obfuscation handling (f*ck, f.u.c.k, fuuuck) matched against the track's
 * forbidden word list.
 */

export type BannedWordViolation = {
  banned: string;
  /** The token in the text that triggered the match. */
  matched: string;
};

const LEET_MAP: Record<string, string> = {
  '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't',
};

/** Normalize a token for banned-word comparison. */
export function normalizeForBanCheck(raw: string): string {
  let s = raw.toLowerCase();
  // Map common leet substitutions before stripping symbols.
  s = s.replace(/[@431!05$7]/g, (ch) => LEET_MAP[ch] ?? ch);
  // Treat censor characters as wildcards -> remove them (f*ck -> fck handled below).
  s = s.replace(/[^a-z]/g, '');
  // Collapse letter stretching: fuuuck -> fuck (3+ repeats to 1; keep doubles like "ll").
  s = s.replace(/([a-z])\1{2,}/g, '$1');
  return s;
}

function singularize(word: string): string {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  return word;
}

/**
 * Does `token` match `banned`, allowing censor-character omissions?
 * "f*ck" normalizes to "fck" — we accept tokens whose letters are a
 * subsequence of the banned word missing at most interior characters.
 * Only applied to tokens that actually contained censor symbols.
 */
function matchesWithOmissions(token: string, banned: string): boolean {
  if (token === banned) return true;
  if (token.length < 2 || token.length >= banned.length) return false;
  // Must share first and last letter and be an ordered subsequence.
  if (token[0] !== banned[0] || token[token.length - 1] !== banned[banned.length - 1]) return false;
  let bi = 0;
  for (const ch of token) {
    bi = banned.indexOf(ch, bi);
    if (bi === -1) return false;
    bi++;
  }
  // Only allow a small number of omitted letters (censored vowels).
  return banned.length - token.length <= 2;
}

function tokenMatchesBanned(tokenNorm: string, bannedNorm: string, hadCensorChars: boolean): boolean {
  if (!tokenNorm || !bannedNorm) return false;
  if (tokenNorm === bannedNorm) return true;
  if (singularize(tokenNorm) === bannedNorm || tokenNorm === singularize(bannedNorm)) return true;
  return hadCensorChars && matchesWithOmissions(tokenNorm, bannedNorm);
}

/** Did the token's interior contain censor symbols (e.g. f*ck, f.u.c.k)? */
function hasCensorChars(rawToken: string): boolean {
  const interior = rawToken.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
  return /[^a-zA-Z0-9']/.test(interior);
}

/** Split text into raw tokens keeping intra-word symbols (so "f*ck" stays one token). */
function rawTokens(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Find banned-word violations in a piece of text. */
export function findBannedWords(text: string, bannedWords: string[]): BannedWordViolation[] {
  const banned = bannedWords
    .map((w) => ({ original: w, norm: normalizeForBanCheck(w) }))
    .filter((b) => b.norm.length > 0);
  if (banned.length === 0 || !text.trim()) return [];

  const violations: BannedWordViolation[] = [];
  const seen = new Set<string>();

  // Multi-word banned phrases: check against the normalized full text.
  const normalizedText = rawTokens(text).map(normalizeForBanCheck).join(' ');
  for (const b of banned) {
    if (!b.original.trim().includes(' ')) continue;
    const phraseNorm = b.original
      .trim()
      .split(/\s+/)
      .map(normalizeForBanCheck)
      .join(' ');
    if (phraseNorm && normalizedText.includes(phraseNorm) && !seen.has(b.original)) {
      violations.push({ banned: b.original, matched: b.original });
      seen.add(b.original);
    }
  }

  // Single-word bans: token-by-token.
  for (const token of rawTokens(text)) {
    const tokenNorm = normalizeForBanCheck(token);
    if (!tokenNorm) continue;
    const censored = hasCensorChars(token);
    for (const b of banned) {
      if (b.original.trim().includes(' ')) continue;
      const key = `${b.original}::${token}`;
      if (seen.has(key)) continue;
      if (tokenMatchesBanned(tokenNorm, b.norm, censored)) {
        violations.push({ banned: b.original, matched: token });
        seen.add(key);
      }
    }
  }
  return violations;
}

/** True when the text contains none of the banned words. */
export function passesBannedWords(text: string, bannedWords: string[]): boolean {
  return findBannedWords(text, bannedWords).length === 0;
}
