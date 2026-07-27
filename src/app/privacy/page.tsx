import Link from 'next/link';
import { LegalFooter } from '@/components/legal-footer';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';
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
          <p className="text-sm text-muted-foreground">Last updated: July 27, 2026 · Bar 4 Bar Studio</p>
        </header>

        <article className="space-y-6 text-muted-foreground leading-relaxed text-sm font-code">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">1. Overview</h2>
            <p>Bar 4 Bar Studio (&quot;we&quot;, &quot;us&quot;) respects your creative privacy. This policy explains what data we collect when you use our web app at bar4bar.ink (the &quot;Service&quot;) and how we use it. By using the Service you also agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Account data:</strong> email, display name, photo URL (if provided by Google), authentication identifiers (via Firebase Auth), and account status.</li>
              <li><strong className="text-white">Creative data:</strong> albums, tracks, lyrics, style profiles, DNA/vibe settings, and project metadata stored in Firebase Firestore.</li>
              <li><strong className="text-white">Usage &amp; billing data:</strong> Ink balances and ledgers, AI action costs, subscription tier/status, Stripe customer and subscription identifiers (we do not store full card numbers).</li>
              <li><strong className="text-white">Product analytics:</strong> in-app events tied to your account or session — for example signup, session/page views, opening the track editor, pricing and checkout steps, upgrade clicks, Ink depletion and free-tier limit hits, AI feature use, achievements/quests/streaks, share-card actions, and similar studio activity. Events may include limited metadata (feature name, amounts, plan, referral code).</li>
              <li><strong className="text-white">Marketing attribution:</strong> campaign or referral tags from links you follow (for example <code className="text-white/80">?ref=</code> values), stored with your signup when present, and aggregate landing-hit counts used in admin metrics.</li>
              <li><strong className="text-white">Abuse-prevention identifiers:</strong> a hashed form of your email may be stored in an identity registry so one-time welcome Ink, Pro feature preview, and similar perks cannot be farmed by repeatedly deleting and recreating accounts.</li>
              <li><strong className="text-white">Local / device data:</strong> preferences, scratch pad text, UI state, cookie-consent flag, and similar keys in browser localStorage or cookies needed to run the app.</li>
              <li><strong className="text-white">AI prompts:</strong> lyric context and studio settings sent to Google Gemini via our servers for generation — not used by us to train public models; processing follows Google&apos;s API terms.</li>
              <li><strong className="text-white">Communications:</strong> transactional emails (for example welcome, purchase, membership, and account-deletion notices) and the address you use to contact support.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">3. How We Use Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, sync, and secure the studio (auth, vault, AI tools, gamification).</li>
              <li>Process payments, fulfill Ink and Pro entitlements, and prevent billing abuse.</li>
              <li>Measure product performance and conversion (funnels, feature use, admin growth metrics).</li>
              <li>Attribute marketing and referral traffic, and operate optional advertising measurement.</li>
              <li>Send transactional email about your account and purchases (not marketing blasts unless you separately opt in).</li>
              <li>Respond to support requests and enforce our Terms.</li>
            </ul>
            <p>We do not sell your lyrics or personal data.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">4. Analytics, Ads &amp; Pixels</h2>
            <p>We use first-party product analytics stored in our Firebase project and reviewed in the admin dashboard. Separately, we may load:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">TikTok Pixel</strong> — advertising and conversion measurement (for example page view, registration, checkout). Events may be associated with a hashed email or user id when you are signed in. See TikTok&apos;s privacy terms.</li>
              <li><strong className="text-white">Google AdSense</strong> — ads on selected public marketing/legal pages only (not inside the signed-in studio tools). See Google&apos;s advertising and privacy terms.</li>
            </ul>
            <p>Browser storage and cookie details are in our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>. You can clear site data in your browser; that may sign you out or reset preferences.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">5. Service Providers</h2>
            <p>We use third parties to operate the Service, including:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Google Firebase</strong> — authentication, database, hosting.</li>
              <li><strong className="text-white">Stripe</strong> — payments and subscriptions.</li>
              <li><strong className="text-white">Google Gemini</strong> — AI generation features.</li>
              <li><strong className="text-white">Resend</strong> — transactional email delivery.</li>
              <li><strong className="text-white">TikTok / Google</strong> — optional ads and measurement as described above.</li>
            </ul>
            <p>Each provider processes data under its own terms. We may also use internal operational alerting (for example Telegram) for security or outage notices; those channels are for operators, not a public marketing list.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">6. Retention &amp; Deletion</h2>
            <p>We retain data while your account is active. You may delete your account in Settings (&quot;Danger Zone&quot;), which removes your profile and cloud projects and cancels active Studio Pro billing when applicable. Some records may be retained as required by law (for example Stripe billing history) or for abuse prevention (hashed identity registry entries so welcome perks are not repeatedly claimed). Analytics event history may be retained in aggregate or anonymized form for metrics.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">7. Your Rights</h2>
            <p>Depending on your region, you may have rights to access, correct, export, or delete personal data. Contact us at <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>. EU/UK users may lodge complaints with their supervisory authority.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">8. Security</h2>
            <p>We use industry-standard encryption in transit (HTTPS), Firebase security rules, and server-side verification for AI and billing actions. No system is 100% secure — use strong passwords and export vault backups (Pro) when available.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">9. Children</h2>
            <p>The Service is not directed to children under 13 (or 16 in the EU). We do not knowingly collect data from minors.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">10. Changes</h2>
            <p>We may update this policy. Material changes will be posted here with an updated date.</p>
          </section>
        </article>

        <LegalFooter className="pt-8 border-t border-white/10" />
      </div>
    </div>
  );
}
