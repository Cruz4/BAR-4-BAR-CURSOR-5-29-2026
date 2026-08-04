'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  Droplets, 
  ArrowLeft, 
  Zap, 
  Sparkles, 
  Star, 
  Globe, 
  Lock, 
  ShieldCheck, 
  Compass, 
  Palette, 
  Target, 
  Dna,
  ChevronRight,
  ClipboardPaste,
  RefreshCw,
  Fingerprint,
  TrendingDown,
  Timer,
  Info,
  Shield,
  FileText,
  Gavel,
  Wand2,
  MonitorPlay,
  Mic,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import { LegalFooter } from '@/components/legal-footer';
import { LoginStudioAtmosphere } from '@/components/marketing/login-studio-atmosphere';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  PRO_YEARLY_BILLED,
  PRO_YEARLY_SAVINGS_BADGE,
  PRO_YEARLY_TOGGLE_LABEL,
  INK_PACK_YEARLY_DISCOUNT_SHORT,
  PRO_MONTHLY_INK,
  PRO_YEARLY_INK,
  VISITOR_INK_SUMMARY,
  VISITOR_FEATURES,
  PRO_YEARLY_EXCLUSIVES,
  getProTierFeatures,
  getTierFeatureHighlight,
  getProHeadlinePerks,
  getVisitorHeadlinePerks,
  getResidencyVsPermanentFaqAnswer,
  getReferralFaqAnswer,
  getArtistHomeFaqAnswer,
  getPostSharingFaqAnswer,
  getProCheckoutCtaLine,
} from '@/lib/studio-tiers';
import { FREE_ALBUM_LIMIT, FREE_TRACK_LIMIT, SIGNUP_INK } from '@/lib/subscription';
import { TierPriceSummary } from '@/components/tier-price-summary';
import { trackStudioEvent } from '@/lib/analytics-client';
import { TIKTOK_CONTENT_TYPE, trackTikTokEvent } from '@/lib/tiktok-pixel';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { trackUpgradeClick } from '@/lib/conversion-analytics';
import { useAuth } from '@/hooks/use-auth';
import { buildLoginPath, buildProCheckoutPath } from '@/lib/checkout-intent';
import { vaultHref } from '@/lib/scene-home';
import { getStoredMarketingRef } from '@/lib/marketing-attribution';

function proFeatureIcon(text: string) {
  if (text.includes('Roadmap') || text.includes('feedback')) return MessageSquare;
  if (text.includes('DNA') || text.includes('REMIX') || text.includes('∞')) return Dna;
  if (text.includes('Creative') || text.includes('Effects')) return Wand2;
  if (text.includes('Performance') || text.includes('teleprompter')) return MonitorPlay;
  if (text.includes('Freestyle')) return Mic;
  if (text.includes('PDF') || text.includes('export') || text.includes('share')) return FileText;
  if (text.includes('Vault') || text.includes('import')) return Shield;
  if (text.includes('Generation') || text.includes('synthesis')) return BrainCircuit;
  if (text.includes('50%') || text.includes('Best price')) return TrendingDown;
  if (text.includes('BYO')) return Zap;
  if (text.includes('Unlimited')) return Star;
  if (text.includes('residency')) return Droplets;
  return Check;
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const ref = getStoredMarketingRef();
    void trackStudioEvent(ANALYTICS_EVENTS.PRICING_VIEW, {
      path: '/pricing',
      ...(ref ? { ref } : {}),
    });
    trackTikTokEvent('ViewContent', {
      content_name: 'Studio Pro Pricing',
      content_type: TIKTOK_CONTENT_TYPE,
      ...(ref ? { ref } : {}),
    });
  }, [user]);

  const handleSelectPlan = (tierName: string) => {
    if (tierName !== 'Visitor') {
      trackUpgradeClick('pricing', {
        tier: tierName,
        billing: isYearly ? 'yearly' : 'monthly',
        skipTrial: true,
      });
      const checkoutPath = buildProCheckoutPath(isYearly);
      if (user) {
        router.push(checkoutPath);
      } else {
        router.push(buildLoginPath(checkoutPath));
      }
    } else if (user) {
      router.push(vaultHref());
    } else {
      router.push('/login');
    }
  };

  const TIERS = [
    {
      name: 'Visitor',
      price: '$0',
      description: `Full AI lyric tools on ${SIGNUP_INK} welcome Ink — ${FREE_ALBUM_LIMIT} album, ${FREE_TRACK_LIMIT} tracks demo catalog; custom vault saves are Pro.`,
      membership: 'Free Artist',
      ink: VISITOR_INK_SUMMARY,
      headlinePerks: getVisitorHeadlinePerks(),
      features: VISITOR_FEATURES.map((text) => ({
        text,
        icon: text.includes('locked') ? Lock : Sparkles,
        highlight: 'none' as const,
        hide: false,
      })),
      cta: 'Start Writing',
      variant: 'outline' as const
    },
    {
      name: 'Studio Pro',
      price: isYearly ? PRO_YEARLY_PRICE : PRO_MONTHLY_PRICE,
      period: '/mo',
      billedText: isYearly ? `Billed annually (${PRO_YEARLY_BILLED})` : 'Billed monthly',
      description: isYearly
        ? 'Unlimited catalog, vault saves, Performance & DNA Drop — plus yearly fuel, savings & roadmap input.'
        : 'Unlimited catalog, vault saves, Performance & DNA Drop — your studio, not just more tokens.',
      membership: 'Professional Member',
      ink: isYearly
        ? `${PRO_YEARLY_INK.toLocaleString()} residency Ink/mo included`
        : `${PRO_MONTHLY_INK.toLocaleString()} residency Ink/mo included`,
      headlinePerks: getProHeadlinePerks(isYearly ? 'yearly' : 'monthly'),
      features: [
        { text: PRO_YEARLY_SAVINGS_BADGE, icon: TrendingDown, highlight: isYearly ? 'yearly' : 'none', hide: !isYearly },
        ...getProTierFeatures(isYearly ? 'yearly' : 'monthly').map((text) => ({
          text,
          icon: proFeatureIcon(text),
          highlight: getTierFeatureHighlight(text, isYearly ? 'Pro Yearly' : 'Pro Monthly'),
          hide: false,
        })),
      ],
      cta: getProCheckoutCtaLine(isYearly ? 'yearly' : 'monthly'),
      variant: 'default' as const,
      popular: true
    }
  ];

  const FAQS = [
    {
      q: 'What is INK?',
      a: 'Ink powers AI tools in the studio—rhyme scans, vibe analysis, Studio Draft, creative effects, and similar actions. Typing your own lyrics, editing bars, saving albums, and moving tracks around does not spend Ink. You only use Ink when you run a billed AI feature.',
    },
    {
      q: 'How is Bar 4 Bar different from Suno or ChatGPT?',
      a: 'Unlike Suno, Udio, or a general chatbot, Bar 4 Bar is a lyric and rhyme workstation: DNA strains, section maps, rhyme pulse, and vault exports stay in your project. Copy-pasting to ChatGPT loses that context — here every generation already knows your track. Pro unlocks the catalog workflow (vault saves, unlimited slots, Performance Mode); Ink powers AI inside the studio.',
    },
    {
      q: 'Is my Artist Home page free?',
      a: getArtistHomeFaqAnswer(),
    },
    {
      q: 'What is the difference between Residency and Permanent Ink?',
      a: getResidencyVsPermanentFaqAnswer(),
    },
    {
      q: 'What is DNA & Remix Mode?',
      a: "It is our proprietary architectural tool. DNA Extraction pulls themes, motifs, and technical patterns from any source text. Remix Mode then utilizes those extracted 'strains' to synthesize a completely original lyrical draft.",
    },
    {
      q: 'What is Artist Style Training?',
      a: 'It is our high-fidelity technical extraction protocol. By analyzing your existing lyrics, the workstation learns your unique cadence, vocabulary variety, and rhyme density to anchor future neural suggestions.',
    },
    {
      q: 'Can I store full discographies?',
      a: 'Yes. Bar 4 Bar is built to be your career-long rhyme book. Unlike simple note apps, our Vault allows you to organize unlimited albums and tracks (Pro) in a professional structure.',
    },
    {
      q: 'How secure is my hardware?',
      a: 'Your lyrics and project DNA are stored in an encrypted cloud environment with real-time backups. We value the privacy of the creative process—your work is yours alone.',
    },
    {
      q: 'How does Refer a Friend work?',
      a: getReferralFaqAnswer(),
    },
    {
      q: 'Can I share a post from my Artist Home?',
      a: getPostSharingFaqAnswer(),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-primary/30 overflow-x-hidden">
      <LoginStudioAtmosphere />

      <header className="fixed top-0 left-0 right-0 h-14 border-b border-white/5 bg-background/75 backdrop-blur-xl z-[200] flex items-center px-4 sm:px-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="font-code text-muted-foreground hover:text-primary transition-all group -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Studio
          </Button>
        </Link>
        <div className="flex-1 flex justify-center pointer-events-none">
          <span className="font-headline text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-foreground/90">
            Studio Memberships
          </span>
        </div>
        <div className="w-[7.5rem] sm:w-[9.5rem]" aria-hidden />
      </header>
      
      <div className="container relative z-10 mx-auto max-w-5xl pt-20 pb-12 px-4">
        <div className="text-center mb-10 space-y-3">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm md:text-base text-muted-foreground font-code uppercase tracking-[0.2em] font-bold">From Demo Room to Professional Suite.</motion.p>
          
          <div className="flex flex-col items-center gap-4 pt-12">
            <div className="relative flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/10 p-1.5 rounded-full px-8 shadow-2xl">
              <div className="absolute -top-10 right-0">
                <span className="text-[9px] bg-accent text-white px-4 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(244,63,94,0.4)] border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  {PRO_YEARLY_TOGGLE_LABEL}
                </span>
              </div>

              <div className="flex items-center gap-6">
                <Label className={cn("text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all duration-300", !isYearly ? "text-primary scale-110" : "text-muted-foreground opacity-40")}>Monthly</Label>
                <Switch checked={isYearly} onCheckedChange={setIsYearly} className="scale-110" />
                <Label className={cn(
                  "text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all duration-500", 
                  "text-accent drop-shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse scale-110"
                )}>
                  Yearly
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-20 items-stretch max-w-4xl mx-auto">
          {TIERS.map((tier) => (
            <Card key={tier.name} className={cn("relative flex flex-col border-2 transition-all duration-500 backdrop-blur-2xl group", tier.popular && isYearly ? "border-accent bg-accent/5 shadow-2xl scale-105 z-10" : "border-white/5 bg-card/40")}>
              {(tier.popular && isYearly) && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white px-4 py-1 text-[8px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg z-20">Recommended Choice</div>}
              
              <CardHeader className="pb-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="font-headline text-3xl text-foreground tracking-tight shrink-0">{tier.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 shrink-0">{tier.membership}</Badge>
                </div>
                <CardDescription className="font-code text-sm text-foreground/75 leading-relaxed">{tier.description}</CardDescription>
                <div className="space-y-1 pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                        "text-5xl font-bold tracking-tighter transition-all duration-700 leading-none",
                        tier.name === 'Studio Pro' 
                          ? (isYearly ? "text-accent drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "text-primary")
                          : "text-foreground"
                    )}>
                        {tier.price}
                    </span>
                    {tier.period && <span className="text-muted-foreground font-code text-sm opacity-60">{tier.period}</span>}
                  </div>
                  {tier.billedText && (
                      <p className={cn(
                          "text-[11px] font-bold uppercase tracking-widest",
                          tier.name === 'Studio Pro' && !isYearly ? "text-primary/60" : "text-accent/60"
                      )}>
                          {tier.billedText}
                      </p>
                  )}
                </div>
                {'headlinePerks' in tier && tier.headlinePerks && (
                  <TierPriceSummary
                    lines={tier.headlinePerks}
                    variant={tier.name === 'Studio Pro' ? (isYearly ? 'yearly' : 'pro') : 'visitor'}
                    size="md"
                    className="pt-3 border-t border-white/10"
                  />
                )}
              </CardHeader>

              <CardContent className="space-y-6 flex-grow flex flex-col">
                <div className={cn("flex items-center gap-3 p-4 rounded-xl border border-dashed", tier.popular && isYearly ? "bg-accent/10 border-accent/20" : "bg-foreground/5 border-foreground/10")}>
                  <div className={cn("p-2 rounded-lg shadow-inner", tier.popular && isYearly ? "bg-accent text-white" : "bg-muted text-muted-foreground")}><Droplets className="h-4 w-4 fill-current animate-pulse"/></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Studio Capacity</p><p className="text-base font-bold font-code text-foreground">{tier.ink}</p></div>
                </div>

                <div className="space-y-3 flex-grow">
                  {tier.features.filter(f => !f.hide).map((feature, idx, arr) => {
                    const isFirstYearlyExclusive =
                      isYearly &&
                      tier.name === 'Studio Pro' &&
                      (PRO_YEARLY_EXCLUSIVES as readonly string[]).includes(feature.text) &&
                      !arr.slice(0, idx).some((f) => (PRO_YEARLY_EXCLUSIVES as readonly string[]).includes(f.text));
                    return (
                    <React.Fragment key={idx}>
                      {isFirstYearlyExclusive && (
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent pt-3 mt-1 border-t border-accent/25">
                          Yearly Exclusives — fuel, savings & roadmap input
                        </p>
                      )}
                    <div className={cn(
                      "flex items-start gap-3 text-[13px] font-code group/item rounded-lg px-2.5 py-2 -mx-2 transition-colors",
                      feature.highlight === 'yearly' && "bg-accent/10 border border-accent/20",
                      feature.highlight === 'pro' && tier.name === 'Studio Pro' && "bg-primary/5 border border-primary/15"
                    )}>
                      <div className={cn(
                        "mt-0.5 p-0.5 rounded-sm shrink-0",
                        feature.icon === Lock ? "opacity-30" : feature.highlight === 'yearly' ? "text-accent" : feature.highlight === 'pro' ? "text-primary" : "text-current"
                      )}><feature.icon className="h-4 w-4" /></div>
                      <span className={cn(
                        "transition-colors leading-relaxed",
                        feature.icon === Lock ? "text-muted-foreground/50 italic" : "text-foreground/80 group-hover/item:text-foreground",
                        feature.highlight === 'yearly' && "text-accent font-bold",
                        feature.highlight === 'pro' && "text-primary font-semibold"
                      )}>{feature.text}</span>
                    </div>
                    </React.Fragment>
                    );
                  })}
                </div>
              </CardContent>

              <CardFooter className="pt-6 pb-8">
                <Button className={cn("w-full h-12 text-sm font-bold shadow-xl rounded-lg group/btn", tier.popular && isYearly ? "bg-accent text-white hover:bg-accent/90" : "bg-foreground/5 text-foreground border border-foreground/10 hover:bg-foreground/10")} onClick={() => handleSelectPlan(tier.name)}>
                  {tier.cta}<ChevronRight className="ml-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <section className="max-w-2xl mx-auto py-12 border-t border-white/5">
          <div className="text-center mb-8 space-y-2"><h2 className="text-2xl md:text-3xl font-headline font-bold text-foreground tracking-tighter uppercase">Studio Intelligence FAQ</h2><div className="w-12 h-1 bg-primary mx-auto rounded-full" /></div>
          <Accordion type="single" collapsible className="w-full space-y-4">
            {FAQS.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-lg bg-black/20 px-4 overflow-hidden border-white/5 hover:border-primary/20 transition-colors">
                <AccordionTrigger className="hover:no-underline font-headline text-base text-left py-4 text-white hover:text-primary transition-colors">{faq.q}</AccordionTrigger>
                <AccordionContent className="font-code text-xs text-muted-foreground leading-relaxed pb-4 pt-2 border-t border-white/5">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <footer className="py-12 text-center space-y-6">
            <LegalFooter />
            <div className="bg-black/40 backdrop-blur-md border border-white/5 inline-flex items-center gap-2 p-2 rounded-xl px-6 shadow-2xl">
                <img src="/Logo.png" alt="Logo" className="h-6 w-6" />
                <p className="text-[9px] font-code text-muted-foreground uppercase tracking-[0.4em]">Bar 4 Bar Studio &copy; 2026</p>
            </div>
        </footer>
      </div>
    </div>
  );
}
