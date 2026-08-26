import Link from 'next/link';
import { LegalFooter } from '@/components/legal-footer';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Terms of Service',
  description:
    'Terms governing Bar 4 Bar Studio, including The Scene, DNA Drops, music releases, Ink, AI tools, and user content.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="container max-w-3xl mx-auto py-16 px-4 space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-primary text-sm font-bold uppercase tracking-widest hover:underline">← Back to Studio</Link>
          <h1 className="font-headline text-4xl font-bold uppercase text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: August 18, 2026 · Bar 4 Bar Studio</p>
        </header>

        <article className="space-y-6 text-muted-foreground leading-relaxed text-sm font-code">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">1. Agreement</h2>
            <p>By creating an account, signing in, purchasing Ink or a subscription, publishing or buying a music release, posting on The Scene or an Artist Home, or otherwise using Bar 4 Bar Studio (the &quot;Service&quot;), you agree to these Terms and our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If you do not agree, do not use the Service.</p>
            <p>These Terms are a contract between you and the operators of Bar 4 Bar Studio (&quot;Bar 4 Bar&quot;, &quot;we&quot;, &quot;us&quot;). We are a software platform. We are not a record label, publisher, manager, booking agent, lawyer, or bank.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">2. The Service</h2>
            <p>Bar 4 Bar is a creative workstation and social music platform. Features may include lyric tools, AI co-writing, project vaults, DNA Drops (public lyric snapshots), Releases (in-app song sales and streams), Library (in-app player), The Scene, Artist Home pages, guestbook, friends, wall posts, comments, voice notes, Msgs (private in-app messages), Lock pages, Studio Progress, and related tools. Features can be added, changed, limited, or turned off at any time.</p>
            <p>AI features — including line suggestions, draft generation, rhyme tools, vibe analysis, remix workflows, and similar outputs — are assistive tools only. They do not replace your creative judgment, legal review, or professional advice.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">3. Eligibility, Accounts &amp; Ink</h2>
            <p>You must be at least 13 years old to use the Service. You must be at least 18 years old to publish, price, or sell a music release, connect payouts, or receive earnings. If you are between 13 and 18 you may use writing tools only with a parent or guardian&apos;s permission where required by law. You may not use the Service if you are barred from doing so under U.S. or other applicable law.</p>
            <p>You must provide accurate account information and keep credentials secure. You are responsible for activity on your account.</p>
            <p><strong className="text-foreground">Ink</strong> is the Service&apos;s virtual currency for AI actions and similar studio tools. Ink has no cash value outside the Service, is non-transferable, and residency Ink may reset per plan terms. Ink is never used to buy music. Purchases are processed by Stripe; refunds follow our billing policy and applicable law.</p>
            <p>We may log account and studio activity — including product analytics, billing events, and abuse-prevention signals — as described in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, to operate the Service, measure performance, prevent Ink and perk farming, and enforce these Terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">4. Your Content &amp; License to Us</h2>
            <p>You retain ownership of lyrics, recordings, artwork, voice notes, posts, and projects you create—including master recordings you upload as music releases. Bar 4 Bar is not a label and does not claim your masters or publishing.</p>
            <p>You grant Bar 4 Bar a worldwide, non-exclusive, royalty-free license to host, store, process, transcode, preview, stream, display, reproduce, and distribute your content solely as needed to operate and promote the Service (for example: Library, Artist Home, share links, The Scene, foil cards you post, and 30-second previews). This license lasts until you delete the content or your account, except for copies already shared, cached, backed up, or that other users lawfully unlocked.</p>
            <p>You represent and warrant that you have all rights needed to upload, post, remix, analyze, or sell anything you provide, including copyrights, neighboring rights, trademarks, publicity rights, and sample clearances. You are solely responsible for copyright, sampling, trademark, and publishing clearance for work you release or sell. Bar 4 Bar does not review uploads for clearance and does not guarantee that your work is legal to sell or perform.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">5. DNA Drops vs Music Releases</h2>
            <p><strong className="text-foreground">DNA Drop</strong> is a public lyric snapshot and related share page. It is not a sell desk. Publishing a DNA Drop does not sell audio or transfer rights.</p>
            <p><strong className="text-foreground">Music Releases</strong> publish recordings for sale or House distribution: upload audio, set a price or pay-what-you-want amount when applicable, and publish the release. Fans buy once and stream in the app. Preview is typically 30 seconds until unlocked. Library is an in-app player, not a Spotify, Apple Music, or download store listing.</p>
            <p>On ordinary paid release sales we keep a tiered platform fee (currently 25% below $3, 15% from $3 through $4.99, and 10% from $5 up) to operate the Service; the remainder is the artist&apos;s share, subject to chargebacks, refunds, taxes, and Stripe&apos;s fees and payout rules. Artist releases have no free checkout; admin-selected House releases are the account-included exception. Uploading a song is not a label deal and does not transfer ownership to us.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">6. In-App Stream License (Buyers)</h2>
            <p>If you buy or unlock a release, you receive a limited, personal, non-exclusive, non-transferable, revocable license to stream that recording inside the Service for your own private use. You do not buy the master, publishing, stems, download rights, sync rights, or a file you may copy off-platform.</p>
            <p>You may not rip, download (except any in-app control we expressly provide), redistribute, resell, publicly perform outside the Service, claim ownership of, train models on, or commercially exploit another artist&apos;s recording. We may revoke stream access if a sale is refunded, charged back, or the content is removed for legal or Terms reasons. Purchases are generally final except where law requires otherwise.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">7. Marketplace, Payouts &amp; Taxes</h2>
            <p>When a fan buys a release, the contract for that recording is between the artist and the fan. Bar 4 Bar provides the platform, hosting, checkout, and a limited in-app stream. We are not a party to that sale beyond the platform fee and the licenses in these Terms.</p>
            <p>Artist payouts are processed by Stripe Connect after the artist completes identity and bank onboarding. Stripe, not Bar 4 Bar, pays the artist&apos;s bank on Stripe&apos;s schedule. Sales made before onboarding may be held and released once payouts are enabled, or handled as Stripe and these Terms allow. Chargebacks, refunds, unpaid negative balances, and fraud may reduce, reverse, or claw back an artist&apos;s share. You authorize us and Stripe to offset amounts you owe against future earnings.</p>
            <p>You are solely responsible for reporting and paying taxes on earnings. We may issue tax forms or collect tax information where legally required. We do not provide tax advice.</p>
            <p>Prices, fees, and payout timing may change. We may withhold, delay, or refuse payouts when we reasonably suspect fraud, infringement, or Terms violations.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">8. The Scene, Artist Home &amp; User Posts</h2>
            <p>The Scene, Artist Home, guestbook, comments, wall posts, foil cards, voice notes, Auto-Tune processing, friends, and similar features are public or semi-public by design when you use them. Content you post can be seen, copied, or shared by others. We do not promise confidentiality for anything you publish on those surfaces.</p>
            <p>You are solely responsible for what you post, including lyrics, images, voice recordings, and statements about other people. Do not post content you do not have the right to share. Voice notes and Auto-Tune takes are still your content; we may store processed audio to play it back.</p>
            <p>We are not obligated to monitor User Content, but we may remove, hide, or refuse any content, delist a drop, or suspend an account at any time, with or without notice, including for legal risk, abuse, or operational reasons. Other users&apos; posts are theirs, not ours. We are not liable for User Content or for other users&apos; conduct.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">9. Msgs (Private Messages)</h2>
            <p>Msgs (private in-app messages between users) are stored on our systems so the feature can work. They are not end-to-end encrypted. Do not send secrets you cannot afford a provider or a lawful process to see. We may access, review, or disclose Msgs content when we believe it is needed to operate the Service, enforce these Terms, or comply with law.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">10. AI-Generated Content</h2>
            <p>The Service uses third-party AI models (including Google Gemini) to produce suggestions, drafts, rhymes, analyses, and other outputs based on your inputs and studio settings. By using AI features, you acknowledge and agree that:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Assistive only.</strong> AI output is provided as creative inspiration and drafting aid — not as finished, verified, or publication-ready work.</li>
              <li><strong className="text-foreground">No guarantee of quality.</strong> Output may be inaccurate, incomplete, repetitive, off-tone, offensive, or inconsistent with your intent. Bar 4 Bar does not review AI output before it is shown to you.</li>
              <li><strong className="text-foreground">No guarantee of originality.</strong> AI suggestions may resemble existing works, common phrases, or material in training data. We do not warrant that output is unique, non-infringing, or safe to publish without further editing and clearance.</li>
              <li><strong className="text-foreground">Your responsibility.</strong> You are solely responsible for reviewing, editing, fact-checking, and deciding whether to use, share, perform, record, or monetize any AI-assisted content. You accept full responsibility for lyrics and projects you save, export, or publish from the Service.</li>
              <li><strong className="text-foreground">Not legal or professional advice.</strong> Nothing generated by the Service constitutes legal, copyright, clearance, or music-industry advice. Consult qualified professionals before commercial release.</li>
              <li><strong className="text-foreground">Ink spent is non-refundable.</strong> Ink consumed by AI actions is spent when the request is processed, regardless of whether you accept or use the result.</li>
            </ul>
            <p>Bar 4 Bar Studio and its operators are not responsible for AI-generated outputs, how you use them, or any claims arising from your published or distributed work — including copyright disputes, sampling issues, defamation, or contractual obligations with labels, collaborators, or platforms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">11. Acceptable Use</h2>
            <p>You may not use the Service to: generate or upload illegal content; exploit minors; harass, dox, or impersonate others; post malware; scrape or abuse APIs; circumvent Ink billing, paywalls, or stream limits; resell or rip releases; infringe IP; run spam or fake engagement; or attempt unauthorized access. We may suspend or terminate accounts that violate these Terms, and we may cooperate with law enforcement.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">12. Copyright Complaints</h2>
            <p>If you believe content on the Service infringes your copyright, send a notice to <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a> with: (a) your contact information; (b) a description of the work; (c) the URL or location of the allegedly infringing material; (d) a statement that you have a good-faith belief the use is not authorized; (e) a statement under penalty of perjury that the information is accurate and that you are the owner or authorized agent; and (f) your physical or electronic signature.</p>
            <p>We may remove reported material and, in appropriate circumstances, terminate repeat infringers. If your material was removed and you believe that was a mistake, you may send a counter-notice to the same address. We are not a court; submitting a notice does not guarantee a particular outcome.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">13. Subscriptions</h2>
            <p>Pro plans renew automatically until cancelled in Settings or via the Stripe Customer Portal. Yearly Pro includes plan-specific Ink residency and pack discounts as described at checkout. Price changes will be communicated in advance where required by law. Features, Ink costs, tier perks, and studio tools may change independently of your subscription billing cycle.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">14. Changes, Availability &amp; Discontinuation</h2>
            <p>Bar 4 Bar Studio is offered on an ongoing basis only. We do not guarantee that the Service, any feature, AI model, Ink economy, marketplace, or tier benefit will remain available, unchanged, or supported indefinitely.</p>
            <p>We may add, remove, modify, suspend, or discontinue the Service — or any part of it — at any time, including for maintenance, legal compliance, security, abuse prevention, business reasons, or force majeure. Where practical and where not prohibited by law, we will attempt to provide reasonable advance notice before a full shutdown of the Service; however, we may act immediately when required (for example, by court order, platform policy, or an urgent security issue).</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-foreground">Your backups.</strong> You are responsible for exporting and backing up your lyrics, albums, audio, and vault data. Pro members may use vault export; we are not liable for loss of access to projects after the Service changes or ends, subject to our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</li>
              <li><strong className="text-foreground">Ink on discontinuation.</strong> Unused Ink has no cash value outside the Service and is not convertible to money if the Service shuts down.</li>
              <li><strong className="text-foreground">Subscriptions on discontinuation.</strong> Active subscriptions may be cancelled or handled through Stripe and applicable law; we do not promise refunds beyond what law requires.</li>
              <li><strong className="text-foreground">Catalog on discontinuation.</strong> Release stream licenses may end if we stop hosting a recording. We are not obligated to keep audio online forever.</li>
            </ul>
            <p>We are not liable to you or any third party for any modification, suspension, or discontinuation of the Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">15. Disclaimers</h2>
            <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED SERVICE, ERROR-FREE AI OUTPUT, SUCCESSFUL PAYOUTS, UNINTERRUPTED STREAMS, OR THAT THE SERVICE WILL MEET YOUR CREATIVE OR COMMERCIAL GOALS. YOU USE THE SERVICE AT YOUR OWN RISK.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">16. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, BAR 4 BAR STUDIO AND ITS OPERATORS, AFFILIATES, AND SUPPLIERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES — INCLUDING LOST PROFITS, LOST DATA, LOST SALES, CHARGEBACKS, REPUTATIONAL HARM, OR CLAIMS RELATED TO AI-GENERATED CONTENT, USER CONTENT, OR MUSIC RIGHTS — ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) FIFTY U.S. DOLLARS ($50).</p>
            <p>Some places do not allow certain limits. In those places, our liability is limited to the maximum extent the law allows. These limits apply even if a remedy fails of its essential purpose.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">17. Indemnity</h2>
            <p>You will defend, indemnify, and hold harmless Bar 4 Bar Studio and its operators, affiliates, and suppliers from any claims, damages, losses, and costs (including reasonable attorneys&apos; fees) arising out of: (a) your content, recordings, posts, or releases; (b) your use of AI output; (c) your violation of these Terms or the law; (d) your infringement of someone else&apos;s rights; or (e) disputes between you and fans, collaborators, labels, or other users. We may assume exclusive defense of any matter, at your expense, and you will cooperate.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">18. Termination</h2>
            <p>You may delete your account at any time in Settings. If you have an active Studio Pro subscription, confirming account deletion also cancels your Stripe subscription so billing stops. We may terminate or suspend your account, delist drops, or discontinue the Service in whole or in part, for violations of these Terms or for operational reasons described in Section 14. Upon termination, cloud data may be deleted per our Privacy Policy. Stream licenses and public posts may end. Amounts already paid to Stripe or already paid out may not be recoverable.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">19. Governing Law</h2>
            <p>These Terms are governed by the laws of the United States and the State in which the Service&apos;s operators maintain their principal place of business, without regard to conflict-of-law rules. Exclusive venue for disputes is the state or federal courts located there, except where applicable law requires otherwise. If a provision is unenforceable, the rest still applies. These Terms are the entire agreement between you and us about the Service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">20. Contact &amp; Updates</h2>
            <p>Questions: <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>. We may update these Terms; material changes will be reflected by the &quot;Last updated&quot; date at the top of this page. Continued use after changes constitutes acceptance.</p>
            <p>In-app features, Ink pricing, tier perks, fees, and studio tools may change at any time without updating the &quot;Last updated&quot; date above — only revisions to this Terms document use that date.</p>
          </section>
        </article>

        <LegalFooter className="pt-8 border-t border-white/10" />
      </div>
    </div>
  );
}
