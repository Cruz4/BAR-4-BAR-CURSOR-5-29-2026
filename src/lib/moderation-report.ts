export type ModerationReportTarget = 'post' | 'user';

export const MODERATION_REPORT_REASONS: Array<{ id: string; label: string }> = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or hate' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'copyright', label: 'Copyright or stolen work' },
  { id: 'sexual', label: 'Sexual or exploitative content' },
  { id: 'violence', label: 'Violence or threats' },
  { id: 'other', label: 'Something else' },
];

export type ModerationReportPayload = {
  targetKind: ModerationReportTarget;
  targetId: string;
  targetUserId?: string;
  targetUserName?: string;
  reasonId: string;
  detail?: string;
  contextUrl?: string;
};
