export const POST_POLL_MIN_OPTIONS = 2;
export const POST_POLL_MAX_OPTIONS = 6;
export const POST_POLL_OPTION_MAX_LENGTH = 120;

export type PostPollResultsVisibility = 'after_vote' | 'always';

export type PostPollOption = {
  id: string;
  label: string;
};

/** Public poll definition. Vote totals and voter choices never live here. */
export type PostPoll = {
  options: PostPollOption[];
  resultsVisibility: PostPollResultsVisibility;
};

export type CreatePostPoll = {
  options: string[];
  resultsVisibility?: PostPollResultsVisibility;
};

export type PostPollViewerState = {
  hasVoted: boolean;
  selectedOptionId?: string;
  resultsVisible: boolean;
  totalVotes?: number;
  counts?: Record<string, number>;
};

export function buildPostPoll(input: CreatePostPoll | undefined): PostPoll | undefined {
  if (!input) return undefined;
  if (!Array.isArray(input.options)) throw new Error('Add at least two poll choices.');
  const labels = input.options.map((value) => String(value || '').trim());
  if (labels.some((label) => !label)) throw new Error('Every poll choice needs text.');
  if (labels.length < POST_POLL_MIN_OPTIONS || labels.length > POST_POLL_MAX_OPTIONS) {
    throw new Error(`Polls need ${POST_POLL_MIN_OPTIONS} to ${POST_POLL_MAX_OPTIONS} choices.`);
  }
  if (labels.some((label) => label.length > POST_POLL_OPTION_MAX_LENGTH)) {
    throw new Error(`Poll choices can be up to ${POST_POLL_OPTION_MAX_LENGTH} characters.`);
  }
  if (new Set(labels.map((label) => label.toLocaleLowerCase())).size !== labels.length) {
    throw new Error('Poll choices must be different.');
  }
  return {
    options: labels.map((label, index) => ({ id: `option_${index + 1}`, label })),
    resultsVisibility: input.resultsVisibility === 'always' ? 'always' : 'after_vote',
  };
}

export function parsePostPoll(raw: unknown): PostPoll | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.options)) return undefined;
  const options: PostPollOption[] = [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const item of data.options) {
    if (!item || typeof item !== 'object') return undefined;
    const option = item as Record<string, unknown>;
    const id = typeof option.id === 'string' ? option.id.trim() : '';
    const label = typeof option.label === 'string' ? option.label.trim() : '';
    if (!/^option_[1-6]$/.test(id) || !label || label.length > POST_POLL_OPTION_MAX_LENGTH) return undefined;
    const normalizedLabel = label.toLocaleLowerCase();
    if (ids.has(id) || labels.has(normalizedLabel)) return undefined;
    ids.add(id);
    labels.add(normalizedLabel);
    options.push({ id, label });
  }
  if (options.length < POST_POLL_MIN_OPTIONS || options.length > POST_POLL_MAX_OPTIONS) return undefined;
  return {
    options,
    resultsVisibility: data.resultsVisibility === 'always' ? 'always' : 'after_vote',
  };
}
