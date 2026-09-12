/** Human-readable admin activity lines — keep this free of server-only imports. */

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function flag(value: unknown): boolean {
  return value === true || value === 'true';
}

function describePost(metadata: Record<string, unknown>): string {
  const parts: string[] = [];
  if (flag(metadata.hasImage)) parts.push('photo');
  if (flag(metadata.hasVideo)) parts.push('video');
  if (flag(metadata.hasVoice)) parts.push('voice');
  if (flag(metadata.hasEmbed)) parts.push('embed');
  if (flag(metadata.hasPoll)) parts.push('poll');
  if (!parts.length) return 'Posted text on their Artist Home wall';
  return `Posted on their Artist Home wall (${parts.join(', ')})`;
}

export function describeStudioActivity(
  event: string,
  metadata: Record<string, unknown> = {}
): string {
  const path = str(metadata.path);
  const slug = str(metadata.slug);
  const trigger = str(metadata.trigger);
  const limitType = str(metadata.limitType);
  const method = str(metadata.method);
  const ref = str(metadata.ref);

  switch (event) {
    case 'page_view':
      return path ? `Opened ${path}` : 'Opened a page';
    case 'pricing_view':
      return path && path !== '/pricing' ? `Opened Pricing (${path})` : 'Opened Pricing';
    case 'share_card_opened':
      return slug ? `Opened @${slug}'s Artist Home` : 'Opened an Artist Home card';
    case 'share_card_generated':
      return slug ? `Generated a share card for @${slug}` : 'Generated a share card';
    case 'profile_post_created':
      return describePost(metadata);
    case 'profile_reverb':
      return 'Reverbed a post';
    case 'profile_friend_request':
      return 'Sent a friend request';
    case 'profile_friend_accept':
      return 'Accepted a friend request';
    case 'profile_guestbook_signed':
      return 'Signed a guestbook';
    case 'signup':
      return `Signed up${method ? ` with ${method}` : ''}${ref ? ` via ${ref}` : ''}`;
    case 'session_start':
      return 'Signed in / started a session';
    case 'track_editor_open':
      return 'Opened a lyrics sheet';
    case 'checkout_started':
      return 'Started checkout';
    case 'checkout_completed':
      return 'Finished checkout';
    case 'upgrade_click':
      return trigger ? `Tapped upgrade (${trigger})` : 'Tapped upgrade';
    case 'low_ink_hit':
      return 'Hit low Ink';
    case 'ink_depletion':
      return 'Ran out of Ink';
    case 'free_limit_hit':
      return limitType ? `Hit the free ${limitType} limit` : 'Hit a free-tier limit';
    case 'trial_quest_complete':
      return 'Finished the trial quest';
    case 'achievement_unlocked':
      return str(metadata.achievementId)
        ? `Unlocked trophy ${str(metadata.achievementId)}`
        : 'Unlocked a trophy';
    case 'quest_step_complete':
      return 'Completed a quest step';
    case 'streak_milestone':
      return 'Hit a streak milestone';
    case 'leaderboard_view':
      return 'Opened the leaderboard';
    case 'user_activated':
      return 'Activated (first real studio use)';
    case 'ai_action':
      return str(metadata.actionName) ? `Used Ink: ${str(metadata.actionName)}` : 'Used Ink';
    default:
      break;
  }

  const keys = Object.keys(metadata).filter((key) => metadata[key] != null && metadata[key] !== '');
  if (path) return `${event.replace(/_/g, ' ')} on ${path}`;
  if (!keys.length) return event.replace(/_/g, ' ');
  return `${event.replace(/_/g, ' ')} · ${keys
    .slice(0, 4)
    .map((key) => `${key}=${String(metadata[key])}`)
    .join(', ')}`;
}

export function describeLandingVisit(input: {
  path?: string | null;
  ref?: string | null;
  guestAlias?: string | null;
  uaFamily?: string | null;
  botLikely?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  referrer?: string | null;
  ipHash?: string | null;
}): string {
  const signedIn =
    input.userName && input.userEmail
      ? `${input.userName} <${input.userEmail}>`
      : input.userName || input.userEmail || '';
  const who = signedIn || input.guestAlias || 'Anonymous visitor';
  const page = input.path || '/';
  const via = input.ref && input.ref !== 'organic' ? ` from ${input.ref}` : ' (organic / untagged)';
  const client = input.uaFamily ? ` · ${input.uaFamily}` : '';
  const bot = input.botLikely ? ' · looks like a bot' : '';
  const network = input.ipHash ? ` · IP cluster ${input.ipHash}` : '';
  const from = input.referrer ? ` · from ${input.referrer}` : '';
  return `${who} visited ${page}${via}${client}${bot}${network}${from}`;
}
