import Link from 'next/link';
import { LegalFooter } from '@/components/legal-footer';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Cookie Policy',
  description: 'How Bar 4 Bar Studio uses cookies and local storage.',
  path: '/cookies',
});

export default function CookiesPage() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="container max-w-3xl mx-auto py-16 px-4 space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-primary text-sm font-bold uppercase tracking-widest hover:underline">← Back to Studio</Link>
          <h1 className="font-headline text-4xl font-bold uppercase text-white">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: July 27, 2026</p>
        </header>

        <article className="space-y-6 text-muted-foreground leading-relaxed text-sm font-code">
          <p>Bar 4 Bar Studio uses cookies and browser storage to operate the app, remember preferences, and (where enabled) measure marketing and show ads on public pages. See also our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Essential Storage</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Firebase Auth session</strong> — keeps you signed in.</li>
              <li><strong className="text-white">sidebar_state</strong> — remembers sidebar open/closed preference.</li>
              <li><strong className="text-white">bar4bar-* keys</strong> — local mirrors of albums, scratch pad, and UI preferences for faster load and offline resilience.</li>
              <li><strong className="text-white">b4b-cookie-consent</strong> — records that you acknowledged this notice.</li>
              <li><strong className="text-white">Marketing attribution</strong> — short-lived session/local tags from campaign links (for example <code className="text-white/80">?ref=</code>) so we can attribute signups.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Analytics &amp; Advertising</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">TikTok Pixel</strong> — may set cookies or similar identifiers for ads and conversion measurement on the Service.</li>
              <li><strong className="text-white">Google AdSense</strong> — may set advertising cookies on selected public marketing and legal pages (not inside the signed-in studio workstation).</li>
            </ul>
            <p>First-party product analytics (feature use, guest try-sheet funnel steps, checkout funnels, and similar events) are stored in our own Firebase project and are not third-party ad cookies; details are in the Privacy Policy.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Managing Cookies</h2>
            <p>You can clear cookies and site data in your browser settings. Clearing storage may sign you out and remove local project mirrors until cloud sync reloads. Ad and measurement networks may also offer their own opt-out tools.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Contact</h2>
            <p>Questions: <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.</p>
          </section>
        </article>

        <LegalFooter className="pt-8 border-t border-white/10" />
      </div>
    </div>
  );
}
