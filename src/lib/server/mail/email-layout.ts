/** Shared HTML shell for AKAsheet transactional emails. */

import { getPublicAppUrl } from '@/lib/app-url';
import { LEGAL_ENTITY_NAME } from '@/lib/brand';
import { SUPPORT_EMAIL } from '@/lib/support';

const FOOTER_LINK_STYLE =
  'color:#93c5fd;text-decoration:none';

function legalMailingAddress(): string | null {
  const line = process.env.LEGAL_MAILING_ADDRESS?.trim();
  return line || null;
}

function studioEmailLegalFooterHtml(baseUrl: string): string {
  const privacy = `${baseUrl}/privacy`;
  const terms = `${baseUrl}/terms`;
  const usage = `${baseUrl}/usage`;
  const address = legalMailingAddress();
  const addressBlock = address
    ? `<p style="margin:0 0 8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6b6b76">${escapeHtml(address)}</p>`
    : '';

  return `
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:16px 0" />
              <p style="margin:0 0 8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6b6b76">
                ${escapeHtml(LEGAL_ENTITY_NAME)}
              </p>
              ${addressBlock}
              <p style="margin:0 0 8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6b6b76">
                <a href="${escapeHtml(privacy)}" style="${FOOTER_LINK_STYLE}">Privacy</a>
                · <a href="${escapeHtml(terms)}" style="${FOOTER_LINK_STYLE}">Terms</a>
                · <a href="${escapeHtml(usage)}" style="${FOOTER_LINK_STYLE}">Account &amp; billing</a>
              </p>
              <p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6b6b76">
                These are account and billing messages about your AKAsheet studio — not a marketing newsletter.
                They are sent while your account is active. To stop all email from us, delete your account in
                <a href="${escapeHtml(usage)}" style="${FOOTER_LINK_STYLE}">Settings</a>.
              </p>`;
}

function studioEmailLegalFooterText(baseUrl: string): string {
  const address = legalMailingAddress();
  return [
    LEGAL_ENTITY_NAME,
    address || '',
    `Privacy: ${baseUrl}/privacy`,
    `Terms: ${baseUrl}/terms`,
    `Account & billing: ${baseUrl}/usage`,
    '',
    'These are account and billing messages about your AKAsheet studio — not a marketing newsletter.',
    'They are sent while your account is active. To stop all email from us, delete your account in Settings.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function wrapStudioEmail(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): { html: string; text: string } {
  const baseUrl = getPublicAppUrl();
  const logoSrc = `${baseUrl}/Logo.png`;
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
              <p style="margin:0 0 12px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6b6b76">
                This mailbox isn’t monitored. Questions? Email
                <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}" style="color:#93c5fd;text-decoration:none">${escapeHtml(SUPPORT_EMAIL)}</a>
                — or just reply and it’ll reach us.
              </p>
              ${studioEmailLegalFooterHtml(baseUrl)}
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
    '',
    studioEmailLegalFooterText(baseUrl),
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
