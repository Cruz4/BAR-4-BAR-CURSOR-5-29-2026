/** Insert soft hyphens in very long tokens so line breaks prefer syllable-like chunks. */
export function imprintDisplayWord(word: string, maxRun = 12): string {
  if (word.length <= maxRun) return word;
  const vowels = /[aeiouyAEIOUYáéíóúàèìòùäëïöü]/;
  let out = '';
  let i = 0;
  while (i < word.length) {
    const remaining = word.length - i;
    if (remaining <= maxRun) {
      out += word.slice(i);
      break;
    }
    let cut = Math.min(maxRun, remaining - 3);
    while (cut > 5 && !vowels.test(word[i + cut - 1] ?? '')) cut -= 1;
    if (cut <= 5) cut = maxRun;
    out += `${word.slice(i, i + cut)}\u00AD`;
    i += cut;
  }
  return out;
}

export function imprintDisplayText(text: string): string {
  return text.replace(/\S{13,}/g, (token) => {
    if (token.startsWith('@')) return token;
    return imprintDisplayWord(token);
  });
}
