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
} from '@/lib/studio-tiers';
import { TierPriceSummary } from '@/components/tier-price-summary';
import { trackStudioEvent } from '@/lib/analytics-client';
import { ANALYTICS_EVENTS } from '@/lib/analytics-events';
import { useAuth } from '@/hooks/use-auth';

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
    trackStudioEvent(ANALYTICS_EVENTS.PRICING_VIEW, { path: '/pricing' });
  }, []);

  const handleSelectPlan = (tierName: string) => {
    if (tierName !== 'Visitor') {
      trackStudioEvent(ANALYTICS_EVENTS.UPGRADE_CLICK, { source: 'pricing', tier: tierName });
      router.push('/usage?tab=cloud');
    } else {
      router.push('/');
    }
  };

  const TIERS = [
    {
      name: 'Visitor',
      price: '$0',
      description: 'Entry-level demo — write with system presets and core AI tools.',
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
        ? 'Everything in Pro Monthly — plus yearly-only fuel, savings & roadmap input.'
        : 'Every limit removed — full professional workstation unlocked.',
      membership: 'Professional Member',
      ink: isYearly ? `${PRO_YEARLY_INK.toLocaleString()} Monthly Residency Ink` : `${PRO_MONTHLY_INK.toLocaleString()} Monthly Residency Ink`,
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
      cta: 'Upgrade to Pro',
      variant: 'default' as const,
      popular: true
    }
  ];

  const FAQS = [
    {
      q: 'What is INK?',
      a: 'Ink is the digital fuel for the Bar 4 Bar Studio logic. Every high-level neural action—from finding complex rhymes to generating full drafts—consumes a specific amount of Ink.',
    },
    {
      q: 'How is Bar 4 Bar different from Suno or ChatGPT?',
      a: 'Unlike Suno, Udio, or a general chatbot, Bar 4 Bar is a lyric and rhyme workstation: you keep albums, DNA strains, rhyme books, and vault exports. Ink pays for structured drafting and analysis—not finished song audio. Pro is built for writers who want to own the words.',
    },
    {
      q: 'How can I stretch my Ink while writing?',
      a: 'Use Studio Draft in the Calibration Hub for full sections (~104 Ink for a typical default song). Next/Previous Line is great for surgical edits but adds up faster if you use it on every bar.',
    },
    {
      q: 'What is the difference between Residency and Permanent Ink?',
      a: 'Residency Ink is provided by your membership and resets monthly—it does not rollover. Permanent Ink is purchased separately, never expires, and is permanent fuel for your workstation.',
    },
    {
      q: 'Who gets the Ink Discounts?',
      a: 'A 50% discount on Permanent Ink Packs is an exclusive benefit for Yearly Pro members. Monthly Pro members pay standard rates for additional Ink packs.',
    },
    {
      q: 'Is Cloud Sync active on the Free tier?',
      a: 'Yes. Your work syncs across devices. Free visitors get DNA & REMIX, the Generation Workstation, and PDF/track export — but are limited to one album and two tracks, system vault presets (no custom saves), and three Creative Effects.',
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
      q: 'What is Studio Roadmap Input?',
      a: "Yearly Pro members get a direct feedback channel to shape what we build next — feature requests, workflow pain points, and priority votes on the studio roadmap. It's our way of investing in artists who commit for the long haul.",
    },
    {
      q: 'How secure is my hardware?',
      a: 'Your lyrics and project DNA are stored in an encrypted cloud environment with real-time backups. We value the privacy of the creative process—your work is yours alone.',
    },
    {
      q: 'Where is Studio Progress?',
      a: 'The Vault shows a Studio Progress panel (desktop left gutter). Open the full progress board from the header profile menu or at /studio-progress for weekly/monthly goals, rank XP, achievements, and leaderboard compare.',
    },
    {
      q: 'What are achievement share cards?',
      a: 'In Ink Store → Settings → Studio Profile, tap Share achievement card to export a foil milestone card with your rank, XP, streak, and latest badge — built for social sharing.',
    },
    {
      q: 'How does Refer a Friend work?',
      a: 'Copy your link from Ink Store → Refer a Friend. When a new artist signs up through it, you each get 150 permanent Ink (referrers earn up to 4 bonuses). Bonuses apply automatically at signup and are tracked on Stripe checkout when they upgrade.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-primary/30 overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <img src="/Bar 4 Bar background.png" alt="Studio Background" className="w-full h-full object-cover opacity-20 blur-[1px] scale-105" />
      </div>
      
      <div className="container relative z-10 mx-auto max-w-5xl py-12 px-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 font-code text-muted-foreground hover:text-primary transition-all group">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Studio
          </Button>
        </Link>

        <div className="text-center mb-12 space-y-4">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-7xl font-headline font-bold text-white tracking-tighter uppercase">Studio Memberships</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-base md:text-lg text-muted-foreground font-code uppercase tracking-[0.2em] font-bold">From Demo Room to Professional Suite.</motion.p>
          
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
                    <CardTitle className="font-headline text-3xl text-white tracking-tight shrink-0">{tier.name}</CardTitle>
                    <Badge variant="outline" className="text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 shrink-0">{tier.membership}</Badge>
                </div>
                <CardDescription className="font-code text-xs text-muted-foreground/80 leading-relaxed">{tier.description}</CardDescription>
                <div className="space-y-1 pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                        "text-5xl font-bold tracking-tighter transition-all duration-700 leading-none",
                        tier.name === 'Studio Pro' 
                          ? (isYearly ? "text-accent drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" : "text-primary")
                          : "text-white"
                    )}>
                        {tier.price}
                    </span>
                    {tier.period && <span className="text-muted-foreground font-code text-sm opacity-60">{tier.period}</span>}
                  </div>
                  {tier.billedText && (
                      <p className={cn(
                          "text-[9px] font-bold uppercase tracking-widest",
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
                    className="pt-3 border-t border-white/10"
                  />
                )}
              </CardHeader>

              <CardContent className="space-y-6 flex-grow flex flex-col">
                <div className={cn("flex items-center gap-3 p-4 rounded-xl border border-dashed", tier.popular && isYearly ? "bg-accent/10 border-accent/20" : "bg-white/5 border-white/10")}>
                  <div className={cn("p-2 rounded-lg shadow-inner", tier.popular && isYearly ? "bg-accent text-white" : "bg-muted text-muted-foreground")}><Droplets className="h-4 w-4 fill-current animate-pulse"/></div>
                  <div><p className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Studio Capacity</p><p className="text-sm font-bold font-code text-white">{tier.ink}</p></div>
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
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent pt-3 mt-1 border-t border-accent/25">
                          Yearly Exclusives — fuel, savings & roadmap input
                        </p>
                      )}
                    <div className={cn(
                      "flex items-start gap-3 text-[11px] font-code group/item rounded-lg px-2 py-1.5 -mx-2 transition-colors",
                      feature.highlight === 'yearly' && "bg-accent/10 border border-accent/20",
                      feature.highlight === 'pro' && tier.name === 'Studio Pro' && "bg-primary/5 border border-primary/15"
                    )}>
                      <div className={cn(
                        "mt-0.5 p-0.5 rounded-sm shrink-0",
                        feature.icon === Lock ? "opacity-30" : feature.highlight === 'yearly' ? "text-accent" : feature.highlight === 'pro' ? "text-primary" : "text-current"
                      )}><feature.icon className="h-3.5 w-3.5" /></div>
                      <span className={cn(
                        "transition-colors leading-tight",
                        feature.icon === Lock ? "text-muted-foreground/40 italic" : "text-muted-foreground group-hover/item:text-white",
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
                <Button className={cn("w-full h-12 text-sm font-bold shadow-xl rounded-lg group/btn", tier.popular && isYearly ? "bg-accent text-white hover:bg-accent/90" : "bg-white/5 text-white border border-white/10 hover:bg-white/10")} onClick={() => handleSelectPlan(tier.name)}>
                  {tier.cta}<ChevronRight className="ml-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <section className="max-w-2xl mx-auto py-12 border-t border-white/5">
          <div className="text-center mb-8 space-y-2"><h2 className="text-2xl md:text-3xl font-headline font-bold text-white tracking-tighter uppercase">Studio Intelligence FAQ</h2><div className="w-12 h-1 bg-primary mx-auto rounded-full" /></div>
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
