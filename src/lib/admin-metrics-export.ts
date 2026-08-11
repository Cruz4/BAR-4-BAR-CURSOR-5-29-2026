import type { AdminMetricsResponse } from '@/lib/admin-metrics-types';

function lines(title: string, rows: Array<[string, string | number | null | undefined]>): string {
  const body = rows
    .map(([k, v]) => `- **${k}:** ${v == null || v === '' ? '—' : v}`)
    .join('\n');
  return `### ${title}\n\n${body}\n`;
}

/** Full Growth Metrics dump optimized for AI analysis (Markdown). */
export function formatAdminMetricsMarkdown(metrics: AdminMetricsResponse): string {
  const period = metrics.period;
  const cache = metrics.cache;
  const f = metrics.funnel;
  const r = metrics.retention;
  const m = metrics.monetization;
  const p = metrics.freeTierPressure;
  const a = metrics.acquisition;
  const attr = metrics.signupAttribution;
  const g = metrics.guestTryFunnel;
  const lock = metrics.lockFunnel;
  const gam = metrics.gamification;

  const parts: string[] = [
    `# Bar 4 Bar — Growth Metrics Export`,
    ``,
    `Generated for AI analysis. Prefer this Markdown when asking for funnel, acquisition, retention, or monetization insights.`,
    ``,
    `## Period`,
    ``,
    `- **Range key:** ${period?.key ?? 'all'}`,
    `- **Label:** ${period?.label ?? 'All time'}`,
    `- **Lookback days:** ${period?.days == null ? 'all-time (day 1 → now)' : period.days}`,
    `- **Window start:** ${period?.startAt ?? 'beginning of data'}`,
    `- **Window end:** ${period?.endAt ?? metrics.generatedAt}`,
    `- **Snapshot generatedAt:** ${metrics.generatedAt}`,
    `- **Cache:** ${cache ? `${cache.fromCache ? 'from cache' : 'live compute'}; computedAt=${cache.computedAt}; expiresAt=${cache.expiresAt}; stale=${cache.stale}` : 'n/a'}`,
    ``,
    `## How to read this`,
    ``,
    `- Totals and funnel steps are scoped to the selected period unless noted.`,
    `- Nested 7 / 30 / 90 day fields are windows ending at "now", clipped inside the selected period.`,
    `- Signup cohort = users whose \`createdAt\` falls in the period.`,
    `- Guest try / LOCK / landing / analytics event counts use event timestamps in the period.`,
    `- Ad spend fields are manual entries (not auto-pulled from ads platforms).`,
    ``,
    lines('Top of funnel', [
      ['Total signups (period)', f.totalSignups],
      ['Signups last 7d', f.signupsLast7Days],
      ['Signups last 30d', f.signupsLast30Days],
      ['Signups last 90d', f.signupsLast90Days],
      ['Activated users (first AI)', f.activatedUsers],
      ['Activation rate %', f.activationRatePercent],
      ['Avg hours → first AI', f.avgHoursToFirstAi],
      ['Avg hours → first Generate Next Line', f.avgHoursToFirstGenerateNextLine],
      ['Track editor opens', f.trackEditorOpens],
      ['Pricing page views', f.pricingPageViews],
      ['Checkout starts', f.checkoutStarts],
      ['Checkout completions', f.checkoutCompletions],
      ['Pricing → checkout %', f.pricingToCheckoutRatePercent],
      ['Checkout → paid %', f.checkoutToPaidRatePercent],
      ['Signup → paid %', f.signupToPaidRatePercent],
    ]),
    lines('Retention', [
      ['Users with 7-day return', r.usersWith7DayReturn],
      ['7-day return rate %', r.sevenDayReturnRatePercent],
      ['Active last 7d', r.activeLast7Days],
      ['Active last 30d', r.activeLast30Days],
    ]),
    lines('Monetization', [
      ['Active Pro monthly', m.activeProMonthly],
      ['Active Pro yearly', m.activeProYearly],
      ['Estimated MRR ($)', m.estimatedMrr],
      ['Ink pack revenue 30d ($)', m.inkPackRevenue30d],
      ['Ink pack revenue 90d ($)', m.inkPackRevenue90d],
      ['Subscription revenue 30d ($)', m.subscriptionRevenue30d],
      ['Total revenue 30d ($)', m.totalRevenue30d],
      ['Total revenue 90d ($)', m.totalRevenue90d],
      ['Avg revenue / paying user ($)', m.avgRevenuePerPayingUser],
    ]),
    lines('Free tier pressure', [
      ['Users at album limit', p.usersAtAlbumLimit],
      ['Users at track limit', p.usersAtTrackLimit],
      ['Users low ink', p.usersLowInk],
      ['Free limit hit events', p.freeLimitHitEvents],
      ['Upgrade click events', p.upgradeClickEvents],
      ['Low ink hit events', p.lowInkHitEvents],
      ['Ink depletion events', p.inkDepletionEvents],
      ['Trial quest complete', p.trialQuestCompleteEvents],
      ['Users ink depleted', p.usersInkDepleted],
      ['Ink depleted + churned 30d', p.inkDepletedChurned30d],
      ['Upgrade clicks — slot_limit', p.upgradeClicksByTrigger.slot_limit],
      ['Upgrade clicks — low_ink', p.upgradeClicksByTrigger.low_ink],
      ['Upgrade clicks — trial_quest', p.upgradeClicksByTrigger.trial_quest],
      ['Upgrade clicks — pricing', p.upgradeClicksByTrigger.pricing],
      ['Upgrade clicks — ink_depletion', p.upgradeClicksByTrigger.ink_depletion],
      ['Upgrade clicks — other', p.upgradeClicksByTrigger.other],
      ['Free limit hits — album', p.freeLimitHitsByType.album],
      ['Free limit hits — track', p.freeLimitHitsByType.track],
    ]),
    lines('Paid acquisition (manual)', [
      ['Ad spend 30d ($)', a.adSpend30d],
      ['Ad spend 90d ($)', a.adSpend90d],
      ['Cost per signup ($)', a.costPerSignup],
      ['Cost per activated user ($)', a.costPerActivatedUser],
      ['Campaign notes', a.notes || '(none)'],
    ]),
    lines('Signup attribution summary', [
      ['Tagged signups', attr.taggedSignups],
      ['Organic / direct signups', attr.organicSignups],
      ['Landing hits (period total)', attr.totalLandingHits],
      ['Landing hits last 30d', attr.landingHitsLast30Days],
      ['Landing hits last 90d', attr.landingHitsLast90Days],
    ]),
  ];

  parts.push(`### Signup attribution by ?ref=\n`);
  if (!attr.byRef.length) {
    parts.push(`_No referral rows._\n`);
  } else {
    parts.push(
      `| ref | label | landing total | landing 7d | landing 30d | landing 90d | signups | signups 7d | signups 30d | signups 90d | hit→signup % | activated | activation % | pro active | share of signups % |`
    );
    parts.push(
      `| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`
    );
    for (const row of attr.byRef) {
      parts.push(
        `| ${row.ref} | ${row.label} | ${row.landingHitsTotal} | ${row.landingHitsLast7Days} | ${row.landingHitsLast30Days} | ${row.landingHitsLast90Days} | ${row.signupsTotal} | ${row.signupsLast7Days} | ${row.signupsLast30Days} | ${row.signupsLast90Days} | ${row.signupConversionRatePercent} | ${row.activated} | ${row.activationRatePercent} | ${row.proActive} | ${row.shareOfSignupsPercent} |`
      );
    }
    parts.push('');
  }

  parts.push(
    lines('Guest try funnel (pre-signup)', [
      ['Opens (period)', g.opens],
      ['Opens last 7d', g.opensLast7Days],
      ['Opens last 30d', g.opensLast30Days],
      ['Opens last 90d', g.opensLast90Days],
      ['Wrote bar', g.wroteBar],
      ['Demo AI requests', g.demoAiRequests],
      ['Demo AI successes', g.demoAiSuccesses],
      ['Demo AI limits', g.demoAiLimits],
      ['Demo AI errors', g.demoAiErrors],
      ['Option accepts', g.optionAccepts],
      ['Option dismisses', g.optionDismisses],
      ['Locked feature taps', g.lockedFeatureTaps],
      ['Signup CTA clicks', g.signupCtaClicks],
      ['Guest-try attributed signups', g.guestTrySignups],
      ['Open → wrote %', g.openToWrotePercent],
      ['Wrote → AI success %', g.wroteToAiPercent],
      ['AI → accept %', g.aiToAcceptPercent],
      ['Open → CTA %', g.openToCtaPercent],
      ['Open → signup %', g.openToSignupPercent],
    ]),
    lines('LOCK / finish-the-bar funnel', [
      ['Opens (period)', lock.opens],
      ['Opens last 7d', lock.opensLast7Days],
      ['Opens last 30d', lock.opensLast30Days],
      ['Opens last 90d', lock.opensLast90Days],
      ['Typed', lock.typed],
      ['Submits', lock.submits],
      ['Branches', lock.branches],
      ['Share cards', lock.shareCards],
      ['Name CTAs', lock.nameCtas],
      ['Where next', lock.whereNext],
      ['Studio opens', lock.studioOpens],
      ['Write another', lock.writeAnother],
      ['Bloodline opens', lock.bloodlineOpens],
      ['Signup CTAs', lock.signupCtas],
      ['Open → typed %', lock.openToTypedPercent],
      ['Typed → submit %', lock.typedToSubmitPercent],
      ['Open → submit %', lock.openToSubmitPercent],
      ['Branch of submit %', lock.branchOfSubmitPercent],
      ['Open → name CTA %', lock.openToNameCtaPercent],
      ['Open → signup CTA %', lock.openToSignupCtaPercent],
    ]),
    lines('Gamification', [
      ['Users with achievements', gam.usersWithAchievements],
      ['Achievement unlock events', gam.achievementUnlockEvents],
      ['Streak milestone events', gam.streakMilestoneEvents],
      ['Share cards generated', gam.shareCardGenerated],
      ['Share cards opened', gam.shareCardOpened],
      ['Leaderboard views', gam.leaderboardViews],
      ['Avg streak (active users)', gam.avgStreakActiveUsers],
    ])
  );

  parts.push(`### Signups by day\n`);
  if (!f.signupsByDay.length) {
    parts.push(`_No daily signup points in chart window._\n`);
  } else {
    parts.push(`| date | count |`);
    parts.push(`| --- | ---: |`);
    for (const d of f.signupsByDay) {
      parts.push(`| ${d.date} | ${d.count} |`);
    }
    parts.push('');
  }

  parts.push(`### Recent analytics events\n`);
  if (!metrics.recentEvents.length) {
    parts.push(`_None in snapshot._\n`);
  } else {
    parts.push(`| timestamp | event | userId | userName | metadata |`);
    parts.push(`| --- | --- | --- | --- | --- |`);
    for (const ev of metrics.recentEvents) {
      const meta = JSON.stringify(ev.metadata || {}).replace(/\|/g, '\\|');
      parts.push(
        `| ${ev.timestamp || '—'} | ${ev.event} | ${ev.userId || '—'} | ${ev.userName || '—'} | ${meta} |`
      );
    }
    parts.push('');
  }

  parts.push(`---`);
  parts.push(`_End of Growth Metrics export._`);
  return parts.join('\n');
}

export function formatAdminMetricsJson(metrics: AdminMetricsResponse): string {
  return JSON.stringify(metrics, null, 2);
}
