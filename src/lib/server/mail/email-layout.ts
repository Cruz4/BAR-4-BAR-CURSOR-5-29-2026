/** Shared HTML shell for AKAsheet transactional emails. */

import { getPublicAppUrl } from '@/lib/app-url';
import { SUPPORT_EMAIL } from '@/lib/support';

export function wrapStudioEmail(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): { html: string; text: string } {
  const logoSrc = `${getPublicAppUrl()}/Logo.png`;
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:28px 0 8px;text-align:center">
           <a href="${escapeHtml(opts.ctaUrl)}"
              style="display:inline-block;background:#3b82f6;color:#fff;font-weight:700;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px">
             ${escapeHtml(opts.ctaLabel)}
           </a>
         </p>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0c;color:#e8e8ed;font-family:Georgia,'Times New Roman',serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0c;padding:32px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#121218;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
          <tr>
            <td style="padding:28px 28px 12px;border-bottom:1px solid rgba(255,255,255,0.06)">
              <img src="${escapeHtml(logoSrc)}" width="56" height="56" alt="AKAsheet"
                   style="display:block;width:56px;height:56px;margin:0 0 14px" />
              <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:#93c5fd">AKAsheet</p>
              <h1 style="margin:10px 0 0;font-size:26px;line-height:1.2;font-weight:700;color:#fff">${escapeHtml(opts.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;font-size:15px;line-height:1.65;color:#c8c8d0">
              ${opts.bodyHtml}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px">
              <p style="margin:0 0 8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6b6b76">
                ${escapeHtml(opts.footerNote || 'You’re getting this because of activity on your AKAsheet studio account.')}
              </p>
              <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6b6b76">
                This mailbox isn’t monitored. Questions? Email
                <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#93c5fd;text-decoration:none">${escapeHtml(SUPPORT_EMAIL)}</a>
                — or just reply and it’ll reach us.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    opts.title,
    '',
    stripTags(opts.bodyHtml),
    opts.ctaLabel && opts.ctaUrl ? `\n${opts.ctaLabel}: ${opts.ctaUrl}` : '',
    '',
    opts.footerNote || 'You’re getting this because of activity on your AKAsheet studio account.',
    `This mailbox isn’t monitored. Questions? Email ${SUPPORT_EMAIL} — or just reply and it’ll reach us.`,
  ]
    .filter(Boolean)
    .join('\n');

  return { html, text };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
