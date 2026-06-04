import Link from 'next/link';
import { LegalFooter } from '@/components/legal-footer';

import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How Bar 4 Bar Studio collects, uses, and protects your data.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="container max-w-3xl mx-auto py-16 px-4 space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-primary text-sm font-bold uppercase tracking-widest hover:underline">← Back to Studio</Link>
          <h1 className="font-headline text-4xl font-bold uppercase text-white">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: May 28, 2026 · Bar 4 Bar Studio</p>
        </header>

        <article className="space-y-6 text-muted-foreground leading-relaxed text-sm font-code">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">1. Overview</h2>
            <p>Bar 4 Bar Studio (&quot;we&quot;, &quot;us&quot;) respects your creative privacy. This policy explains what data we collect when you use our web app and how we use it.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Account data:</strong> email, display name, authentication identifiers (via Firebase Auth).</li>
              <li><strong className="text-white">Creative data:</strong> albums, tracks, lyrics, style profiles, and project settings stored in Firebase Firestore.</li>
              <li><strong className="text-white">Usage data:</strong> Ink balance, AI action logs, subscription status.</li>
              <li><strong className="text-white">Payment data:</strong> processed by Stripe; we do not store full card numbers.</li>
              <li><strong className="text-white">Local data:</strong> preferences, scratch pad text, and UI state in browser localStorage.</li>
              <li><strong className="text-white">AI prompts:</strong> lyric context sent to Google Gemini via our secure server for generation — not used to train public models per Google&apos;s API terms.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">3. How We Use Data</h2>
            <p>To provide the Service, sync your projects, process payments, enforce Ink billing, improve reliability, and respond to support requests. We do not sell your lyrics or personal data.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">4. Service Providers</h2>
            <p>We use Firebase (Google) for auth and database hosting, Stripe for payments, and Google Gemini for AI features. Each provider has its own privacy terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">5. Retention &amp; Deletion</h2>
            <p>We retain data while your account is active. You may delete your account in Settings (&quot;Danger Zone&quot;), which removes your profile and cloud projects. Some billing records may be retained as required by law.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">6. Your Rights</h2>
            <p>Depending on your region, you may have rights to access, correct, export, or delete personal data. Contact us at <a href="mailto:support@bar4bar.studio" className="text-primary hover:underline">support@bar4bar.studio</a>. EU/UK users may lodge complaints with their supervisory authority.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">7. Security</h2>
            <p>We use industry-standard encryption in transit (HTTPS), Firebase security rules, and server-side verification for AI and billing actions. No system is 100% secure — use strong passwords and export vault backups (Pro).</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">8. Children</h2>
            <p>The Service is not directed to children under 13 (or 16 in the EU). We do not knowingly collect data from minors.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">9. Changes</h2>
            <p>We may update this policy. Material changes will be posted here with an updated date.</p>
            <p className="text-xs italic border border-white/10 rounded-lg p-4">Have a lawyer review this policy before commercial launch in regulated markets.</p>
          </section>
        </article>

        <LegalFooter className="pt-8 border-t border-white/10" />
      </div>
    </div>
  );
}
