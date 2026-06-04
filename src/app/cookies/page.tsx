import Link from 'next/link';
import { LegalFooter } from '@/components/legal-footer';

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
          <p className="text-sm text-muted-foreground">Last updated: May 28, 2026</p>
        </header>

        <article className="space-y-6 text-muted-foreground leading-relaxed text-sm font-code">
          <p>Bar 4 Bar Studio uses cookies and browser storage to operate the app. We do not use third-party advertising cookies.</p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Essential Storage</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Firebase Auth session</strong> — keeps you signed in.</li>
              <li><strong className="text-white">sidebar_state</strong> — remembers sidebar open/closed preference.</li>
              <li><strong className="text-white">bar4bar-* keys</strong> — local mirrors of albums, scratch pad, and UI preferences for faster load and offline resilience.</li>
              <li><strong className="text-white">b4b-cookie-consent</strong> — records that you saw this notice.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Managing Cookies</h2>
            <p>You can clear cookies and site data in your browser settings. Clearing storage may sign you out and remove local project mirrors until cloud sync reloads.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Contact</h2>
            <p>Questions: <a href="mailto:support@bar4bar.studio" className="text-primary hover:underline">support@bar4bar.studio</a>. See also our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
          </section>
        </article>

        <LegalFooter className="pt-8 border-t border-white/10" />
      </div>
    </div>
  );
}
