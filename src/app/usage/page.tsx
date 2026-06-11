'use client';

import React, { useContext, useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useUsage } from '@/context/usage-context';
import { DataContext } from '@/context/data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { 
    Loader, 
    Droplets, 
    Sparkles, 
    Check, 
    Zap, 
    Star, 
    Globe, 
    CreditCard, 
    ShieldAlert, 
    TrendingDown, 
    UserCircle, 
    History as HistoryIcon, 
    LayoutGrid, 
    Settings as SettingsIcon, 
    ChevronRight,
    Clock,
    Timer,
    Battery,
    Info,
    X,
    Trash2,
    Mail,
    Coffee,
    LifeBuoy,
} from 'lucide-react';
import { BUY_ME_COFFEE_URL, SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  INK_POOL_LABELS,
  inkHistoryAmountDisplay,
  parseInkHistoryLog,
  type InkPool,
} from '@/lib/ink-ledger';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStripe } from '@/services/stripe';
import { useAuth } from '@/hooks/use-auth';
import { db, auth } from '@/lib/firebase/client/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, signOut } from 'firebase/auth';
import { Progress } from '@/components/ui/progress';
import {
  getInkPackRows,
  getStudioTierPlans,
  getResidencyPoolCap,
  getResidencyProgressPercent,
  getTierFeatureHighlight,
  PRO_YEARLY_EXCLUSIVES,
  INK_PACK_YEARLY_DISCOUNT_SHORT,
  INK_PACK_YEARLY_DISCOUNT_LABEL,
  STUDIO_DRAFT_INK_TIP,
  COMPETITOR_ANCHOR_COPY,
  VISITOR_INK_STORE_NOTICE,
  INK_STORE_PACK_CONTEXT,
  VISITOR_RESIDENCY_POOL_CAPTION,
  getProResidencyRefillCaption,
} from '@/lib/studio-tiers';
import { BYO_API_INK_DISCOUNT_PERCENT } from '@/lib/byo-api';
import { FREE_ALBUM_LIMIT, FREE_TRACK_LIMIT, isProUser } from '@/lib/subscription';
import { FreeTierExpectationsBanner } from '@/components/free-tier-expectations-banner';
import { InkRefillCountdown } from '@/components/ink-refill-countdown';
import { TierPriceSummary } from '@/components/tier-price-summary';
import { StudioProfileSection } from '@/components/gamification/studio-profile-section';
import { PwaInstallGuideCard } from '@/components/pwa-install-prompt';
import { ReferAFriendSection } from '@/components/refer-a-friend-section';
import {
  buildLoginPath,
  isProCheckoutPriceKey,
} from '@/lib/checkout-intent';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function InkPoolBadge({ pool }: { pool: InkPool | 'unknown' }) {
  const label = pool === 'unknown' ? 'Mixed' : INK_POOL_LABELS[pool];
  const className =
    pool === 'residency'
      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
      : pool === 'trial'
        ? 'border-sky-500/30 text-sky-400 bg-sky-500/10'
        : pool === 'permanent'
          ? 'border-orange-500/30 text-orange-400 bg-orange-500/10'
          : 'border-white/15 text-muted-foreground bg-white/5';

  return (
    <Badge variant="outline" className={cn('text-[8px] font-bold uppercase tracking-wider', className)}>
      {label}
    </Badge>
  );
}

function UsagePageContent() {
  const { usageHistory, inkBalance, residencyBalance, trialInkBalance, purchasedBalance, loading, customApiKey, saveCustomApiKey } = useUsage();
  const { isCloudSyncActive } = useContext(DataContext);
  const { user } = useAuth();
  const { checkout, fulfillCheckoutReturn, openBillingPortal, isCheckingOut } = useStripe();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('buy-ink');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  
  const [apiKeyInput, setApiKeyInput] = useState(customApiKey || '');

  useEffect(() => {
    setApiKeyInput(customApiKey || '');
  }, [customApiKey]);
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const checkoutAutoStartedRef = useRef(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');

    if (tab === 'cloud' || tab === 'buy-ink' || tab === 'history' || tab === 'settings') {
      setActiveTab(tab);
    }

    if (success === 'true' && sessionId && user?.id) {
      setIsProcessingOrder(true);
      fulfillCheckoutReturn(sessionId, user.id)
        .then((result) => {
          const inkMsg =
            result.inkAmount > 0
              ? `${result.inkAmount.toLocaleString()} permanent Ink added to your balance.`
              : 'Your Studio Pro membership is active.';
          toast({
            title: result.duplicate ? 'Payment already applied' : 'Payment confirmed',
            description: inkMsg,
          });
          router.replace(`/usage?tab=${tab || 'buy-ink'}`);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Could not update balance';
          toast({
            variant: 'destructive',
            title: 'Ink not credited yet',
            description: message,
          });
        })
        .finally(() => setIsProcessingOrder(false));
      return;
    }

    if (success === 'true') {
      setIsProcessingOrder(true);
      toast({
        title: 'Payment confirmed',
        description: 'Updating your studio balance…',
      });
      setTimeout(() => setIsProcessingOrder(false), 10000);
    }

    if (searchParams.get('canceled') === 'true') {
      toast({ variant: 'destructive', title: 'Checkout Canceled', description: 'No charge was made.' });
      router.replace('/usage?tab=buy-ink');
    }
  }, [searchParams, toast, router, user?.id, fulfillCheckoutReturn]);

  useEffect(() => {
    const rawCheckout = searchParams.get('checkout');
    if (!isProCheckoutPriceKey(rawCheckout) || !user?.id) return;
    if (searchParams.get('success') === 'true' || searchParams.get('canceled') === 'true') return;
    if (checkoutAutoStartedRef.current || isCheckingOut) return;

    checkoutAutoStartedRef.current = true;
    setActiveTab('cloud');

    if (isProUser(user)) {
      router.replace('/usage?tab=cloud');
      return;
    }

    router.replace('/usage?tab=cloud');
    const withTrial = searchParams.get('trial') !== '0';
    checkout(rawCheckout, user.id, user.email, { withTrial });
  }, [searchParams, user, checkout, isCheckingOut, router]);

  const isYearlyUser = user?.subscriptionTier === 'yearly';
  const paidPro = isProUser(user);
  const residencyPoolCap = getResidencyPoolCap(user);
  const residencyProgress = getResidencyProgressPercent(residencyBalance, residencyPoolCap);

  const getPricePacks = () =>
    getInkPackRows(isYearlyUser).map((pack) => ({
      ...pack,
      icon:
        pack.icon === 'Sparkles' ? Sparkles : pack.icon === 'Star' ? Star : HistoryIcon,
      discount: isYearlyUser ? INK_PACK_YEARLY_DISCOUNT_LABEL : null,
    }));

  const handleStripeCheckout = (
    priceKey: 'PRO_MONTHLY' | 'PRO_YEARLY' | 'INK_REFILL' | 'INK_ARTIST' | 'INK_VAULT',
    options?: { withTrial?: boolean }
  ) => {
    if (!user) {
      const trialParam =
        priceKey === 'PRO_MONTHLY' || priceKey === 'PRO_YEARLY'
          ? options?.withTrial === false
            ? '&trial=0'
            : '&trial=1'
          : '';
      const loginPath =
        priceKey === 'PRO_MONTHLY' || priceKey === 'PRO_YEARLY'
          ? buildLoginPath(`/usage?tab=cloud&checkout=${priceKey}${trialParam}`)
          : buildLoginPath('/usage?tab=buy-ink');
      router.push(loginPath);
      return;
    }
    checkout(priceKey, user.id, user.email, options);
  };

  const getSafeTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Recent';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 'Recent' : format(date, 'MM/dd HH:mm:ss');
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden pb-12">
      <FreeTierExpectationsBanner user={user} />
      <div className="container relative z-10 mx-auto max-w-5xl py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Studio Intelligence</h1>
            <Badge
              className={cn(
                'uppercase justify-center text-center px-3 shrink-0',
                isCloudSyncActive ? (isYearlyUser ? 'bg-accent' : 'bg-primary') : 'bg-muted text-muted-foreground'
              )}
            >
              {paidPro ? (isYearlyUser ? 'Yearly Pro' : 'Monthly Pro') : 'Visitor'}
            </Badge>
          </div>
          <p className="text-muted-foreground font-code">Permanent ink never expires — used after your monthly residency pool runs out.</p>
          <p className="text-xs text-muted-foreground/90 max-w-2xl leading-relaxed">{COMPETITOR_ANCHOR_COPY}</p>
          <p className="text-xs text-primary/80 max-w-2xl leading-relaxed flex items-start gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{STUDIO_DRAFT_INK_TIP}</span>
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Card className="bg-muted/10 border-white/5 p-4 flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Residency Ink Pool</span>
                    <span className="font-code text-foreground">{residencyBalance.toLocaleString()}</span>
                </div>
                <Progress value={residencyProgress} className="h-1.5 bg-primary/10" />
                <p className="text-[8px] text-muted-foreground uppercase">
                  {paidPro ? getProResidencyRefillCaption(isYearlyUser) : VISITOR_RESIDENCY_POOL_CAPTION}
                </p>
                {!paidPro && <InkRefillCountdown className="text-[8px] uppercase" />}
            </Card>
            {trialInkBalance > 0 && (
              <Card className="bg-muted/10 border-sky-500/20 p-4 flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Timer className="h-3 w-3 text-sky-400" /> Trial Ink</span>
                  <span className="font-code text-sky-400">{trialInkBalance.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-sky-500/20 rounded-full">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-[8px] text-muted-foreground uppercase">
                  Legacy trial bonus — no longer granted
                </p>
              </Card>
            )}
            <Card className="bg-muted/10 border-white/5 p-4 flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Star className="h-3 w-3" /> Permanent Balance</span>
                    <span className="font-code text-foreground">{purchasedBalance.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-orange-500/20 rounded-full"><div className="h-full bg-orange-500" style={{ width: purchasedBalance > 0 ? '100%' : '0%' }} /></div>
            </Card>
          </div>
        </div>
        <Card className="bg-primary/5 border-primary/20 shadow-2xl overflow-hidden group w-fit max-w-full shrink-0 md:ml-auto">
            <CardContent className="px-5 py-4 flex w-auto items-center justify-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full shadow-inner shrink-0">
                  <Droplets className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="text-center min-w-0">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-[0.2em] mb-0.5">Total Capacity</p>
                    <p className="text-5xl font-bold font-code text-white tracking-tighter tabular-nums leading-none">{inkBalance.toLocaleString()}</p>
                </div>
            </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 flex flex-col items-center">
        <TabsList className="grid w-full grid-cols-4 max-w-[800px] bg-muted/50 border mx-auto h-auto p-1 shadow-inner">
          <TabsTrigger value="buy-ink" className="flex items-center gap-2 font-bold py-3 uppercase text-[10px] tracking-widest"><LayoutGrid className="h-4 w-4"/> Ink Store</TabsTrigger>
          <TabsTrigger value="cloud" className="flex items-center gap-2 font-bold py-3 uppercase text-[10px] tracking-widest"><Star className="h-4 w-4"/> Studio Tier</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 font-bold py-3 uppercase text-[10px] tracking-widest"><HistoryIcon className="h-4 w-4"/> History</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 font-bold py-3 uppercase text-[10px] tracking-widest"><SettingsIcon className="h-4 w-4"/> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="buy-ink" className="space-y-8 w-full">
          <ReferAFriendSection />

          {!paidPro && (
            <div className="border p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg bg-orange-500/5 border-orange-500/25">
              <div className="flex items-start gap-4 min-w-0">
                <div className="p-3 rounded-full bg-orange-500/10 shrink-0">
                  <Info className="h-6 w-6 text-orange-500" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-lg uppercase tracking-tight text-orange-600">
                    {VISITOR_INK_STORE_NOTICE.headline}
                  </p>
                  <p className="text-xs text-muted-foreground font-code leading-relaxed">
                    {VISITOR_INK_STORE_NOTICE.body}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 font-code uppercase tracking-wide">
                    Limits: {FREE_ALBUM_LIMIT} album · {FREE_TRACK_LIMIT} tracks total
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('cloud')}
                className="shrink-0 font-bold text-[10px] uppercase h-10 px-6 border-orange-500/30"
              >
                See Studio Pro
              </Button>
            </div>
          )}

          <div className={cn("border p-6 rounded-xl flex items-center justify-between gap-6 shadow-lg", isYearlyUser ? "bg-accent/5 border-accent/20" : "bg-primary/5 border-primary/20")}>
              <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-full", isYearlyUser ? "bg-accent/10" : "bg-primary/10")}><TrendingDown className={cn("h-6 w-6", isYearlyUser ? "text-accent" : "text-primary")} /></div>
                  <div>
                      <p className="font-bold text-lg uppercase tracking-tight">Yearly Pro Ink Store Discount</p>
                      <p className="text-xs text-muted-foreground font-code">Yearly Pro members receive a permanent {INK_PACK_YEARLY_DISCOUNT_SHORT} at checkout.</p>
                  </div>
              </div>
              {!isYearlyUser && <Button variant="outline" size="sm" onClick={() => setActiveTab('cloud')} className="shrink-0 font-bold text-[10px] uppercase h-10 px-6">Unlock Ink Pack Savings</Button>}
          </div>

          <p className="text-xs text-muted-foreground font-code text-center max-w-2xl mx-auto leading-relaxed">
            {INK_STORE_PACK_CONTEXT}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {getPricePacks().map((pack) => (
              <Card 
                key={pack.name} 
                className={cn(
                    "relative flex flex-col h-full transition-all duration-300", 
                    pack.popular && "border-primary shadow-2xl z-10 bg-card/60",
                    pack.bestValue && "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] z-10 bg-card/60"
                )}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center whitespace-nowrap px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold bg-primary text-primary-foreground shadow-lg rounded-full z-20">
                    Most Popular
                  </div>
                )}
                {pack.bestValue && pack.savingsPercent != null && pack.savingsPercent > 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center whitespace-nowrap px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold bg-emerald-600 text-white shadow-lg rounded-full z-20">
                    Best Value — Save {pack.savingsPercent}%
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                    <div className={cn(
                        "mx-auto p-2 rounded-full mb-2",
                        pack.bestValue ? "bg-emerald-500/10" : "bg-muted"
                    )}>
                        <pack.icon className={cn(
                            "h-5 w-5", 
                            pack.popular ? "text-primary" : pack.bestValue ? "text-emerald-500" : "text-muted-foreground"
                        )} />
                    </div>
                    <CardTitle className="font-headline text-lg">{pack.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex-grow flex flex-col">
                    <div className="mx-auto w-full max-w-[9rem] flex flex-col items-center gap-1 min-h-[4.5rem]">
                        <Droplets
                          className={cn("h-4 w-4", pack.bestValue ? "text-emerald-500" : "text-primary")}
                          aria-hidden
                        />
                        <span className="text-2xl font-bold font-code tabular-nums leading-none">{pack.ink.toLocaleString()}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Ink</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-code uppercase leading-tight min-h-[30px] mt-4">{pack.description}</p>
                    <div className="mx-auto w-full max-w-[9rem] flex flex-col items-center mt-4 min-h-[5.5rem]">
                        {pack.discount ? (
                          <>
                            <span className="text-sm text-muted-foreground/50 line-through font-bold tabular-nums leading-none mb-1">
                              {pack.originalPrice}
                            </span>
                            <TrendingDown
                              className={cn("h-3 w-3 mb-0.5", pack.bestValue ? "text-emerald-500" : "text-accent")}
                              aria-hidden
                            />
                            <span
                              className={cn(
                                "text-2xl font-bold font-code tabular-nums leading-none",
                                pack.bestValue ? "text-emerald-500" : "text-accent"
                              )}
                            >
                              {pack.price}
                            </span>
                            <p
                              className={cn(
                                "text-[7px] font-bold uppercase mt-1",
                                pack.bestValue ? "text-emerald-600" : "text-accent"
                              )}
                            >
                              {pack.discount}
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="h-3 w-3 mb-0.5" aria-hidden />
                            <span className="text-2xl font-bold text-foreground font-code tabular-nums leading-none">
                              {pack.price}
                            </span>
                          </>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="px-5 pb-6 pt-2">
                    <Button 
                        className={cn(
                            "w-full min-h-10 h-auto py-2.5 px-5 sm:px-6 font-bold shadow-lg text-[10px] uppercase tracking-wide gap-2.5 whitespace-normal",
                            pack.bestValue ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                        )} 
                        variant={pack.popular ? 'default' : pack.bestValue ? 'default' : 'outline'} 
                        onClick={() => handleStripeCheckout(pack.priceKey)}
                        disabled={isCheckingOut || isProcessingOrder}
                    >
                        <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="text-center leading-snug whitespace-normal">
                          {isCheckingOut ? 'Opening Checkout…' : 'Purchase Permanent Ink'}
                        </span>
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="cloud" className="w-full space-y-8">
            {paidPro && user && (
              <Card className="border-primary/20 bg-card/50">
                <CardHeader className="pb-4">
                  <CardTitle className="font-headline text-xl flex items-center gap-2.5">
                    <CreditCard className="text-primary h-5 w-5" />
                    Billing &amp; Subscription
                  </CardTitle>
                  <CardDescription className="text-xs uppercase tracking-tight">
                    Update payment method, view invoices, switch plans, or cancel Pro in Stripe.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button
                    className="w-full sm:w-auto h-11 font-bold uppercase text-xs md:text-sm"
                    variant="outline"
                    disabled={isCheckingOut}
                    onClick={() => openBillingPortal(user.id, 'cloud')}
                  >
                    {isCheckingOut ? 'Opening Stripe…' : 'Manage Stripe Account'}
                  </Button>
                </CardFooter>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {getStudioTierPlans(isCloudSyncActive, user?.subscriptionTier).map((plan) => (
                    <Card key={plan.name} className={cn("border-accent flex flex-col relative transition-all duration-500 shadow-xl", plan.badge ? "overflow-visible" : "overflow-hidden", plan.isCurrent && "ring-4 ring-primary/20")}>
                        {plan.badge && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex max-w-[calc(100%-1.5rem)] justify-center">
                            <Badge className="whitespace-nowrap text-[8px] uppercase tracking-widest font-bold bg-accent px-4 py-1.5 shadow-lg">
                              {plan.badge}
                            </Badge>
                          </div>
                        )}
                        <div className={cn("p-6 flex flex-col justify-between text-center border-b min-h-[320px] overflow-hidden rounded-t-lg", plan.badge && "pt-8", plan.name === 'Pro Yearly' ? "bg-accent/10" : plan.name === 'Visitor' ? "bg-muted/10" : "bg-primary/10")}>
                            <div className="space-y-3">
                              <h3 className="text-2xl font-headline font-bold uppercase">{plan.name}</h3>
                              <div className="flex flex-col items-center">
                                  <div><span className={cn("text-5xl font-bold text-white", plan.name === 'Pro Yearly' && "text-accent drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]")}>{plan.price}</span><span className="text-muted-foreground font-code ml-1">{plan.period}</span></div>
                                  {plan.billedText && (
                                    <p className={cn(
                                      "text-[9px] font-bold uppercase tracking-widest mt-1",
                                      plan.name === 'Pro Yearly' ? "text-accent/80" : "text-primary/60"
                                    )}>
                                      {plan.billedText}
                                    </p>
                                  )}
                              </div>
                              <TierPriceSummary
                                lines={plan.headlinePerks}
                                variant={plan.name === 'Pro Yearly' ? 'yearly' : plan.name === 'Visitor' ? 'visitor' : 'pro'}
                                align="center"
                                className="px-1"
                              />
                            </div>
                            <Button
                              className={cn("w-full shadow-lg h-12 text-sm font-bold uppercase", plan.isCurrent ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground")}
                              disabled={plan.isCurrent || isCheckingOut || !plan.priceKey}
                              onClick={() => plan.priceKey && handleStripeCheckout(plan.priceKey)}
                            >
                                {isCheckingOut && plan.priceKey ? 'Opening Checkout…' : plan.isCurrent ? 'Current Tier' : plan.cta}
                            </Button>
                        </div>
                        <div className="p-6 bg-card flex-grow"><ul className="space-y-2">{plan.features.map((feature, idx) => {
                          const highlight = getTierFeatureHighlight(feature, plan.name);
                          const isFirstYearlyExclusive =
                            plan.name === 'Pro Yearly' &&
                            (PRO_YEARLY_EXCLUSIVES as readonly string[]).includes(feature) &&
                            !plan.features.slice(0, idx).some((f) =>
                              (PRO_YEARLY_EXCLUSIVES as readonly string[]).includes(f)
                            );
                          return (
                          <React.Fragment key={feature}>
                          {isFirstYearlyExclusive && (
                            <li className="text-[9px] font-bold uppercase tracking-widest text-accent pt-3 mt-1 border-t border-accent/25 list-none">
                              Yearly Exclusives — fuel, savings & roadmap input
                            </li>
                          )}
                          <li className={cn(
                            "flex items-start gap-3 text-[11px] font-code leading-relaxed rounded-lg px-2 py-1.5 -mx-2",
                            highlight === 'yearly' && "bg-accent/10 border border-accent/20 text-accent font-bold",
                            highlight === 'pro' && "bg-primary/5 border border-primary/15 text-primary font-semibold"
                          )}>
                            <Check className={cn(
                              "h-3.5 w-3.5 mt-0.5 shrink-0",
                              highlight === 'yearly' ? "text-accent" : highlight === 'pro' ? "text-primary" : "text-green-500"
                            )} />
                            <span>{feature}</span>
                          </li>
                          </React.Fragment>
                          );
                        })}</ul></div>
                    </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="history" className="w-full">
            <Card className="bg-card/50 border-white/10 shadow-2xl">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2"><HistoryIcon className="text-primary h-6 w-6" /> Ink History</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-tight">
                      Credits and spends across residency, trial, and permanent Ink — purchases, grants, and AI usage.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-[10px] font-bold uppercase">Timestamp</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Operation</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Pool</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase text-right">Ink</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(() => {
                              const rows = usageHistory
                                .map((log) => parseInkHistoryLog(log))
                                .filter((row): row is NonNullable<typeof row> => row !== null);
                              return rows.length > 0 ? rows.map((row) => (
                                <TableRow key={row.id} className="border-white/5 hover:bg-white/5">
                                    <TableCell className="text-[10px] font-code text-muted-foreground whitespace-nowrap">
                                      {getSafeTimestamp(row.timestamp)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-xs text-white uppercase">{row.label}</span>
                                            {row.details && (
                                              <span className="text-[9px] text-muted-foreground truncate max-w-[280px]">{row.details}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                      <InkPoolBadge pool={row.pool} />
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        'text-right font-code font-bold',
                                        row.type === 'credit' ? 'text-emerald-400' : 'text-primary'
                                      )}
                                    >
                                      {inkHistoryAmountDisplay(row.type, row.amount)}
                                    </TableCell>
                                </TableRow>
                              )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-code text-sm opacity-50 uppercase tracking-[0.4em]">
                                      No ink transactions yet.
                                    </TableCell>
                                </TableRow>
                              );
                            })()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="settings" className="w-full max-w-3xl">
            <div className="space-y-10 text-[15px] md:text-base">
                <StudioProfileSection />
                <PwaInstallGuideCard />
                {isCloudSyncActive && (
                <Card className="border-primary/20">
                    <CardHeader className="pb-4">
                        <CardTitle className="font-headline text-2xl flex items-center gap-2.5"><CreditCard className="text-primary h-6 w-6"/> Billing & Subscription</CardTitle>
                        <CardDescription className="text-sm uppercase tracking-tight">Update payment method, invoices, or cancel Pro.</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2">
                        <Button
                          className="w-full h-12 font-bold uppercase text-xs md:text-sm"
                          variant="outline"
                          disabled={isCheckingOut}
                          onClick={() => user && openBillingPortal(user.id)}
                        >
                            Manage Subscription in Stripe
                        </Button>
                    </CardFooter>
                </Card>
                )}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="font-headline text-2xl flex items-center gap-2.5"><UserCircle className="text-primary h-6 w-6"/> Artist Profile</CardTitle>
                        <CardDescription className="text-sm uppercase tracking-tight">Manage your public studio identity.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Stage Name</Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} className="font-code font-bold h-12 text-base" />
                          <Button onClick={() => {}} className="h-12 px-8 font-bold text-sm shrink-0">Save</Button>
                        </div>
                      </div>
                    </CardContent>
                </Card>
                <Card className={cn("border-2", !isYearlyUser && "opacity-50")}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="font-headline text-2xl">Studio API Bypass (BYO-API)</CardTitle>
                        {!isYearlyUser && <Badge variant="destructive" className="uppercase tracking-widest text-xs shrink-0">Yearly Pro Only</Badge>}
                      </div>
                      <CardDescription className="text-sm leading-relaxed normal-case tracking-normal text-muted-foreground">
                        Connect your Google AI key for your own API quota and rate limits. Google bills tokens on your account; Bar 4 Bar Ink is the workstation orchestration fee (DNA flows, guardrails, remix logic) at {BYO_API_INK_DISCOUNT_PERCENT}% off while BYO is active.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {customApiKey && isYearlyUser && (
                        <div className="p-4 bg-accent/5 border border-accent/20 rounded-md space-y-1">
                            <p className="text-sm leading-relaxed font-code text-accent font-bold"><Zap className="inline h-4 w-4 mr-1.5 align-[-2px]" /> BYO-API active — {BYO_API_INK_DISCOUNT_PERCENT}% off all AI Ink costs.</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">Key stays in this browser only (never stored on Bar 4 Bar servers).</p>
                        </div>
                        )}
                        <form
                          className="flex flex-col sm:flex-row gap-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (isYearlyUser) saveCustomApiKey(apiKeyInput);
                          }}
                        >
                            <Input
                              type="password"
                              autoComplete="current-password"
                              placeholder="AIza..."
                              value={apiKeyInput}
                              onChange={(e) => setApiKeyInput(e.target.value)}
                              disabled={!isYearlyUser}
                              className="font-mono text-base h-12"
                            />
                            <Button type="submit" disabled={!isYearlyUser} className="h-12 px-8 font-bold text-sm shrink-0">Save Key</Button>
                            {customApiKey && (
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!isYearlyUser}
                                className="h-12 px-6 font-bold text-sm shrink-0"
                                onClick={() => {
                                  setApiKeyInput('');
                                  saveCustomApiKey(null);
                                }}
                              >
                                Clear
                              </Button>
                            )}
                        </form>
                    </CardContent>
                </Card>
                <Card className="border-primary/20">
                    <CardHeader className="pb-4">
                        <CardTitle className="font-headline text-2xl flex items-center gap-2.5"><LifeBuoy className="text-primary h-6 w-6"/> Support</CardTitle>
                        <CardDescription className="text-sm uppercase tracking-tight">Help, feedback, and optional tips.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground font-code leading-relaxed">
                        <p>
                          For bugs, billing questions, or account help, email{' '}
                          <a href={SUPPORT_MAILTO} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
                          We typically respond within a few business days.
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
                            <Button variant="outline" className="h-11 px-5 text-xs font-bold uppercase gap-2" asChild>
                                <a href={SUPPORT_MAILTO}>
                                  <Mail className="h-4 w-4" /> Email Support
                                </a>
                            </Button>
                            <Button variant="outline" className="h-11 px-5 text-xs font-bold uppercase gap-2" asChild>
                                <a href={BUY_ME_COFFEE_URL} target="_blank" rel="noopener noreferrer">
                                  <Coffee className="h-4 w-4" /> Buy Me A Coffee
                                </a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/10">
                    <CardHeader className="pb-4">
                        <CardTitle className="font-headline text-2xl flex items-center gap-2.5"><Info className="text-primary h-6 w-6"/> Legal &amp; Policies</CardTitle>
                        <CardDescription className="text-sm uppercase tracking-tight">Terms, privacy, and AI use policies.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-base text-muted-foreground font-code leading-relaxed">
                        <p>Using AI features means you agree to our content policies — including that AI output is assistive, unreviewed, and your responsibility to edit and clear before publishing.</p>
                        <div className="flex flex-wrap gap-3 pt-1">
                            <Button variant="outline" className="h-11 px-5 text-xs font-bold uppercase" asChild>
                                <Link href="/terms">Terms of Service</Link>
                            </Button>
                            <Button variant="outline" className="h-11 px-5 text-xs font-bold uppercase" asChild>
                                <Link href="/privacy">Privacy Policy</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-500/20 bg-red-500/5">
                    <CardHeader className="pb-4">
                      <CardTitle className="font-headline text-2xl text-red-500 flex items-center gap-2.5"><ShieldAlert className="h-6 w-6" /> Danger Zone</CardTitle>
                      <CardDescription className="text-sm uppercase tracking-tight text-red-700">Account eradication is permanent.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wider leading-relaxed">Deleting your studio account is permanent. This will erase all concept albums, project DNA, and saved motifs from the vault.</p>
                        <Button variant="destructive" className="w-full h-12 font-bold uppercase tracking-widest text-xs md:text-sm" onClick={() => setDeleteConfirmOpen(true)}><Trash2 className="h-5 w-5 mr-2" /> Delete Studio Account</Button>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-card border-2">
              <AlertDialogHeader>
                  <AlertDialogTitle className="font-headline text-2xl text-red-500 uppercase">Confirm Data Wipe?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-code">
                      This will permanently delete your Bar 4 Bar account and all associated discographies. This action is absolute and cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                      if (!user || !auth.currentUser) return;
                      setIsDeletingAccount(true);
                      try {
                          const token = await auth.currentUser.getIdToken();
                          const res = await fetch('/api/account/eradicate', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          const body = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            throw new Error(body.error || `Deletion failed (${res.status})`);
                          }
                          await signOut(auth);
                          router.push('/login');
                      } catch (e: any) {
                          toast({ variant: 'destructive', title: "Deletion Failed", description: e.message });
                      } finally {
                          setIsDeletingAccount(false);
                      }
                  }} className="bg-red-600 hover:bg-red-700 font-bold" disabled={isDeletingAccount}>
                      {isDeletingAccount ? "Wiping Hardware..." : "Yes, Delete Account"}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}

export default function UsagePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader className="animate-spin h-8 w-8 text-primary" /></div>}>
      <UsagePageContent />
    </Suspense>
  );
}
