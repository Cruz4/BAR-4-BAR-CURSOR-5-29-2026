/** Shared visitor-cluster scoring — keep free of server-only imports. */

export type VisitorVerdict = 'scanner' | 'scripted' | 'refresh' | 'human' | 'unknown';

export type VisitorClusterStats = {
  hits: number;
  durationMs: number;
  uniqueGuests: number;
  uniquePages: number;
  botHits: number;
  browsers: string[];
  sameOriginHits: number;
  referrerCount: number;
  signedInCount: number;
  probeCount: number;
};

export type VisitorJudgement = {
  verdict: VisitorVerdict;
  label: string;
  reasons: string[];
  canDo: string;
  cannotDo: string;
};

const BOT_BROWSERS = new Set([
  'bot',
  'empty',
  'curl',
  'wget',
  'python-requests',
  'headless',
  'puppeteer',
  'playwright',
  'googlebot',
  'bingbot',
  'gptbot',
  'claudebot',
  'bytespider',
]);

function hitsPerMin(hits: number, durationMs: number): number {
  const minutes = Math.max(durationMs / 60_000, 1 / 60);
  return hits / minutes;
}

export function judgeVisitorCluster(stats: VisitorClusterStats): VisitorJudgement {
  const reasons: string[] = [];
  const rate = hitsPerMin(stats.hits, stats.durationMs);
  const botShare = stats.hits > 0 ? stats.botHits / stats.hits : 0;
  const botBrowser = stats.browsers.some((b) => BOT_BROWSERS.has(b.toLowerCase()));

  if (stats.probeCount > 0) {
    reasons.push(`Hit bait scanner paths (${stats.probeCount}) — looking for WordPress/php/.env holes that do not exist here.`);
  }
  if (botBrowser) reasons.push(`Client family looks automated (${stats.browsers.join(', ') || 'empty'}).`);
  if (botShare >= 0.5) reasons.push(`${Math.round(botShare * 100)}% of saved hits were flagged bot-like.`);
  if (stats.uniqueGuests >= 4 && stats.hits >= 8) {
    reasons.push(`${stats.uniqueGuests} different guest ids from one IP cluster — typical of a script that cannot keep a browser cookie.`);
  }
  if (stats.hits >= 15 && rate >= 3) {
    reasons.push(`${stats.hits} page loads at ~${rate.toFixed(1)}/min — faster than a person browsing.`);
  }
  if (stats.referrerCount === 0 && stats.hits >= 8 && stats.signedInCount === 0) {
    reasons.push('No referrer on the burst — often a direct script, not a link from IG/Google.');
  }
  if (stats.sameOriginHits === 0 && stats.hits >= 8 && stats.signedInCount === 0) {
    reasons.push('No same-origin browser header — common for scrapers hitting the URL directly.');
  }
  if (stats.uniqueGuests <= 1 && stats.uniquePages <= 2 && stats.hits >= 6 && !botBrowser && botShare < 0.3) {
    reasons.push('Same guest, same few pages, over and over — refresh, prefetch, or one tab reloading.');
  }

  let verdict: VisitorVerdict = 'unknown';
  if (stats.probeCount > 0 || botBrowser || botShare >= 0.6) verdict = 'scanner';
  else if (stats.uniqueGuests >= 4 && stats.hits >= 10) verdict = 'scripted';
  else if (stats.hits >= 15 && rate >= 4 && stats.signedInCount === 0) verdict = 'scripted';
  else if (stats.uniqueGuests <= 1 && stats.uniquePages <= 2 && stats.hits >= 6 && botShare < 0.3) {
    verdict = 'refresh';
  } else if (stats.signedInCount > 0 || (botShare < 0.2 && stats.uniqueGuests <= 2 && rate < 3)) {
    verdict = 'human';
  } else if (stats.hits >= 8) verdict = 'scripted';

  const label =
    verdict === 'scanner'
      ? 'Likely scanner / crawler'
      : verdict === 'scripted'
        ? 'Likely scripted browser'
        : verdict === 'refresh'
          ? 'Likely refresh / prefetch'
          : verdict === 'human'
            ? 'Looks like a person'
            : 'Not enough signal';

  if (!reasons.length) {
    reasons.push('No strong scraper fingerprint on the saved public-page hits.');
  }

  return {
    verdict,
    label,
    reasons,
    canDo:
      'Load public pages (home, pricing, login, welcome, discover), scrape what is already public, and probe fake CMS paths. A scripted Chrome can also hammer those URLs without being a signed-in artist.',
    cannotDo:
      'Cannot open admin, spend Ink, see the vault, charge Stripe, or post as an artist unless they actually sign up. Bait /wp-admin and /.env requests are traps — they get a 404 and a scanner ping.',
  };
}

export function visitorVerdictTone(verdict: VisitorVerdict): string {
  if (verdict === 'scanner') return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  if (verdict === 'scripted') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  if (verdict === 'refresh') return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
  if (verdict === 'human') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  return 'border-white/15 bg-white/5 text-muted-foreground';
}
