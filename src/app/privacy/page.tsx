import Link from 'next/link';
import { LegalFooter } from '@/components/legal-footer';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How Bar 4 Bar Studio collects, uses, and protects your data across the studio, The Scene, and First Drops.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="container max-w-3xl mx-auto py-16 px-4 space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-primary text-sm font-bold uppercase tracking-widest hover:underline">← Back to Studio</Link>
          <h1 className="font-headline text-4xl font-bold uppercase text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: August 18, 2026 · Bar 4 Bar Studio</p>
        </header>

        <article className="space-y-6 text-muted-foreground leading-relaxed text-sm font-code">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">1. Overview</h2>
            <p>Bar 4 Bar Studio (&quot;we&quot;, &quot;us&quot;) respects your creative privacy. This policy explains what data we collect when you use our web app at bar4bar.ink (the &quot;Service&quot;) and how we use it. By using the Service you also agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.</p>
            <p>The Service includes a lyric studio, The Scene, Artist Home pages, DNA Drops, First Drops, Library, Msgs (private in-app messages), Lock pages, and related tools. What we collect depends on which of those you use.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Account data:</strong> email, display name, photo URL (if provided by Google), authentication identifiers (via Firebase Auth), and account status.</li>
              <li><strong className="text-foreground">Creative data:</strong> albums, tracks, lyrics, style profiles, DNA/vibe settings, cover art, and project metadata stored in Firebase Firestore and Storage.</li>
              <li><strong className="text-foreground">Audio &amp; media:</strong> First Drop song files and 30-second previews, DNA Drop images, Artist Home media, and voice notes / Auto-Tune takes you record. Audio you sell is stored privately and streamed in-app; we do not sell your masters.</li>
              <li><strong className="text-foreground">Social data:</strong> Artist Home settings, wall posts, comments, likes, guestbook entries, friend requests/friendships, foil cards you share, unique post-view counts, and similar Scene activity. Public Artist Home and share links are visible to anyone with the link (and may be indexed if you make them public).</li>
              <li><strong className="text-foreground">Msgs:</strong> private in-app messages and related delivery metadata, stored on our servers so the inbox can work. Msgs are not end-to-end encrypted.</li>
              <li><strong className="text-foreground">Usage &amp; billing data:</strong> Ink balances and ledgers, AI action costs, subscription tier/status, Stripe customer and subscription identifiers, and (for First Drop sellers) Stripe Connect payout account identifiers, earnings totals, and payout status (we do not store full card or bank numbers — Stripe does).</li>
              <li><strong className="text-foreground">Product analytics:</strong> in-app events tied to your account or session — for example signup, session/page views, opening the track editor, pricing and checkout steps, upgrade clicks, Ink depletion and free-tier limit hits, AI feature use, achievements/quests/streaks, share-card actions, drop plays, and similar studio activity. Events may include limited metadata (feature name, amounts, plan, referral code).</li>
              <li><strong className="text-foreground">Guest try-sheet funnel:</strong> anonymous, aggregate steps on the free try sheet before signup (opened sheet, wrote a bar, used/limited demo Generate Next, accepted or dismissed a suggestion, tapped signup, tapped a locked feature), plus a browser-local temporary guest alias (for example <code className="text-foreground/80">Guest-Silk-7F3A</code>) used only to connect demo activity to a later signup in admin alerts. Used to improve the product; not a named account until you sign up.</li>
              <li><strong className="text-foreground">Marketing attribution:</strong> campaign or referral tags from links you follow (for example <code className="text-foreground/80">?ref=</code> values), stored with your signup when present, and aggregate landing-hit counts used in admin metrics.</li>
              <li><strong className="text-foreground">Abuse-prevention identifiers:</strong> a hashed form of your email may be stored in an identity registry so one-time welcome Ink, Pro feature preview, and similar perks cannot be farmed by repeatedly deleting and recreating accounts.</li>
              <li><strong className="text-foreground">Device &amp; local data:</strong> preferences, scratch pad text, UI state, cookie-consent flag, Deck play history on this browser, Studio Progress expand state, and similar keys in localStorage or cookies needed to run the app. For account security, we store a random browser-session identifier, browser/device type, operating system, sign-in time, and last-active time so you can review and remove signed-in devices. Push-notification tokens if you opt in.</li>
              <li><strong className="text-foreground">AI prompts:</strong> lyric context and studio settings sent to Google Gemini via our servers for generation — not used by us to train public models; processing follows Google&apos;s API terms.</li>
              <li><strong className="text-foreground">Communications:</strong> transactional emails (for example welcome, purchase, membership, and account-deletion notices) and the address you use to contact support.</li>
            </ul>
            <p>We do not collect precise GPS location. We do not require government ID ourselves; Stripe may collect identity documents for payouts under Stripe&apos;s own privacy policy.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">3. How We Use Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, sync, and secure the studio (auth, vault, AI tools, gamification).</li>
              <li>Host and stream First Drops, DNA Drops, Artist Home, The Scene, Library, and Msgs.</li>
              <li>Process payments, fulfill Ink and Pro entitlements, pay artists through Stripe, and prevent billing or stream abuse.</li>
              <li>Count unique views, plays, and similar engagement so owners can see reach.</li>
              <li>Measure product performance and conversion (funnels, feature use, admin growth metrics).</li>
              <li>Attribute marketing and referral traffic, and operate optional advertising measurement.</li>
              <li>Send transactional email about your account and purchases (not marketing blasts unless you separately opt in).</li>
              <li>Respond to support requests, enforce our Terms, and comply with law (including copyright notices).</li>
            </ul>
            <p>We do not sell your lyrics, recordings, or personal data. We do not use your private vault lyrics to train public AI models.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">4. Public vs Private</h2>
            <p>Vault drafts stay in your account until you publish or share them. DNA Drops, live Artist Home pages, The Scene posts, guestbook, and share links are public or link-accessible. First Drop audio is streamed to buyers and may be previewed by visitors. Treat anything you press live or post to the block as public.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">5. Analytics, Ads &amp; Pixels</h2>
            <p>We use first-party product analytics stored in our Firebase project and reviewed in the admin dashboard. Separately, we may load:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">TikTok Pixel</strong> — advertising and conversion measurement (for example page view, registration, checkout). Events may be associated with a hashed email or user id when you are signed in. See TikTok&apos;s privacy terms.</li>
              <li><strong className="text-foreground">Google AdSense</strong> — ads on selected public marketing/legal pages only (not inside the signed-in studio tools). See Google&apos;s advertising and privacy terms.</li>
            </ul>
            <p>Browser storage and cookie details are in our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>. You can clear site data in your browser; that may sign you out or reset preferences.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">6. Service Providers</h2>
            <p>We use third parties to operate the Service, including:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Google Firebase</strong> — authentication, database, file storage, hosting.</li>
              <li><strong className="text-foreground">Stripe</strong> — payments, subscriptions, and Connect payouts (including identity checks Stripe requires).</li>
              <li><strong className="text-foreground">Google Gemini</strong> — AI generation features.</li>
              <li><strong className="text-foreground">Resend</strong> — transactional email delivery.</li>
              <li><strong className="text-foreground">TikTok / Google</strong> — optional ads and measurement as described above.</li>
            </ul>
            <p>Each provider processes data under its own terms. We may also use internal operational alerting (for example Telegram) for security or outage notices; those channels are for operators, not a public marketing list.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">7. Retention &amp; Deletion</h2>
            <p>We retain data while your account is active. You may delete your account in Settings (&quot;Danger Zone&quot;), which removes your profile and cloud projects and cancels active Studio Pro billing when applicable. Some records may be retained as required by law (for example Stripe billing history) or for abuse prevention (hashed identity registry entries so welcome perks are not repeatedly claimed). Analytics event history may be retained in aggregate or anonymized form for metrics. Copies of content you posted to other users&apos; walls, or recordings fans already unlocked, may persist as needed to honor a prior purchase or as cached copies until deleted.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">8. Your Rights</h2>
            <p>Depending on your region, you may have rights to access, correct, export, or delete personal data. Contact us at <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>. EU/UK users may lodge complaints with their supervisory authority. California residents may have additional rights under the CCPA/CPRA; we do not sell personal information as that term is commonly defined.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">9. Security</h2>
            <p>We use industry-standard encryption in transit (HTTPS), Firebase security rules, and server-side verification for AI, streaming, and billing actions. Msgs and vault data are access-controlled, not a guarantee against every breach. No system is 100% secure — use strong passwords and export vault backups (Pro) when available.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">10. Children</h2>
            <p>The Service is not directed to children under 13 (or 16 in the EU). We do not knowingly collect data from minors. You must be 18 or older to sell First Drops or connect payouts.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">11. Changes</h2>
            <p>We may update this policy. Material changes will be posted here with an updated date.</p>
          </section>
        </article>

        <LegalFooter className="pt-8 border-t border-white/10" />
      </div>
    </div>
  );
}
