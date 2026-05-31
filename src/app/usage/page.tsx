'use client';

import React, { useContext, useState, useEffect, Suspense } from 'react';
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
    Battery,
    Info,
    X,
    Trash2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStripe } from '@/services/stripe';
import { useAuth } from '@/hooks/use-auth';
import { db, auth } from '@/lib/firebase/client/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { updateProfile, deleteUser } from 'firebase/auth';
import { Progress } from '@/components/ui/progress';
import { getInkPackRows, getStudioTierPlans, PRO_MONTHLY_INK, PRO_YEARLY_INK, getTierFeatureHighlight, PRO_YEARLY_EXCLUSIVES, INK_PACK_YEARLY_DISCOUNT_SHORT, INK_PACK_YEARLY_DISCOUNT_LABEL } from '@/lib/studio-tiers';
import { TierPriceSummary } from '@/components/tier-price-summary';
import { StudioProfileSection } from '@/components/gamification/studio-profile-section';
import { ReferAFriendSection } from '@/components/refer-a-friend-section';
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

function UsagePageContent() {
  const { usageHistory, inkBalance, residencyBalance, purchasedBalance, loading, customApiKey, saveCustomApiKey } = useUsage();
  const { isCloudSyncActive } = useContext(DataContext);
  const { user } = useAuth();
  const { checkout, fulfillCheckoutReturn, openBillingPortal, isCheckingOut } = useStripe();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('buy-ink');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  
  const [apiKeyInput, setApiKeyInput] = useState(customApiKey || '');
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const isYearlyUser = user?.subscriptionTier === 'yearly';

  const getPricePacks = () =>
    getInkPackRows(isYearlyUser).map((pack) => ({
      ...pack,
      icon: pack.icon === 'Zap' ? Zap : pack.icon === 'Sparkles' ? Sparkles : pack.icon === 'Star' ? Star : HistoryIcon,
      discount: isYearlyUser ? INK_PACK_YEARLY_DISCOUNT_LABEL : null,
    }));

  const handleStripeCheckout = (priceKey: 'PRO_MONTHLY' | 'PRO_YEARLY' | 'INK_STARTER' | 'INK_REFILL' | 'INK_ARTIST' | 'INK_VAULT') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in required', description: 'Log in to purchase or upgrade.' });
      router.push('/login');
      return;
    }
    checkout(priceKey, user.id, user.email);
  };

  const getSafeTimestamp = (timestamp: string | undefined) => {
    if (!timestamp) return 'Recent';
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 'Recent' : format(date, 'MM/dd HH:mm:ss');
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-headline font-bold text-primary tracking-tight">Studio Intelligence</h1>
            <Badge className={cn("mt-1 uppercase", isCloudSyncActive ? (isYearlyUser ? "bg-accent" : "bg-primary") : "bg-muted text-muted-foreground")}>{isCloudSyncActive ? (isYearlyUser ? 'Yearly Pro' : 'Monthly Pro') : 'Visitor'}</Badge>
          </div>
          <p className="text-muted-foreground font-code">Permanent ink never expires — used after your monthly residency pool runs out.</p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Card className="bg-muted/10 border-white/5 p-4 flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Residency Ink Pool</span>
                    <span className="font-code text-foreground">{residencyBalance.toLocaleString()}</span>
                </div>
                <Progress value={(residencyBalance / (isYearlyUser ? PRO_YEARLY_INK : PRO_MONTHLY_INK)) * 100} className="h-1.5 bg-primary/10" />
            </Card>
            <Card className="bg-muted/10 border-white/5 p-4 flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Star className="h-3 w-3" /> Permanent Balance</span>
                    <span className="font-code text-foreground">{purchasedBalance.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-orange-500/20 rounded-full"><div className="h-full bg-orange-500" style={{ width: purchasedBalance > 0 ? '100%' : '0%' }} /></div>
            </Card>
          </div>
        </div>
        <Card className="bg-primary/5 border-primary/20 shadow-2xl overflow-hidden group">
            <CardContent className="p-8 flex items-center gap-6">
                <div className="bg-primary/10 p-3 rounded-full shadow-inner"><Droplets className="h-10 w-10 text-primary animate-pulse" /></div>
                <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-[0.2em] mb-1">Total Capacity</p>
                    <p className="text-5xl font-bold font-code text-white tracking-tighter">{inkBalance.toLocaleString()}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getPricePacks().map((pack) => (
              <Card 
                key={pack.name} 
                className={cn(
                    "relative flex flex-col transition-all duration-300", 
                    pack.popular && "border-primary shadow-2xl scale-105 z-10 bg-card/60",
                    pack.bestValue && "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] scale-105 z-10 bg-card/60"
                )}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center whitespace-nowrap px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold bg-primary text-primary-foreground shadow-lg rounded-full z-20">
                    Most Popular
                  </div>
                )}
                {pack.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center whitespace-nowrap px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold bg-emerald-600 text-white shadow-lg rounded-full z-20">
                    Best Value - Save 25%
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
                <CardContent className="text-center flex-grow space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <Droplets className={cn("h-4 w-4", pack.bestValue ? "text-emerald-500" : "text-primary")} />
                        <span className="text-2xl font-bold font-code">{pack.ink.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-code uppercase leading-tight min-h-[30px]">{pack.description}</p>
                    <div className="flex flex-col gap-1">
                        {pack.discount ? (
                            <div className="flex flex-col items-center">
                                <span className="text-sm text-muted-foreground/50 line-through font-bold">{pack.originalPrice}</span>
                                <div className={cn("flex items-center gap-1 animate-pulse", pack.bestValue ? "text-emerald-500" : "text-accent")}>
                                    <TrendingDown className="h-3 w-3"/> 
                                    <span className="text-2xl font-bold">{pack.price}</span>
                                </div>
                                <p className={cn("text-[7px] font-bold uppercase mt-0.5", pack.bestValue ? "text-emerald-600" : "text-accent")}>
                                    {pack.discount}
                                </p>
                            </div>
                        ) : (<p className="text-2xl font-bold text-foreground">{pack.price}</p>)}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button 
                        className={cn(
                            "w-full h-10 font-bold shadow-lg text-[10px] uppercase",
                            pack.bestValue ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                        )} 
                        variant={pack.popular ? 'default' : pack.bestValue ? 'default' : 'outline'} 
                        onClick={() => handleStripeCheckout(pack.priceKey)}
                        disabled={isCheckingOut || isProcessingOrder}
                    >
                        <CreditCard className="mr-2 h-3 w-3" /> {isCheckingOut ? 'Opening Checkout…' : 'Purchase Permanent Ink'}
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="cloud" className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {getStudioTierPlans(isCloudSyncActive, user?.subscriptionTier).map((plan) => (
                    <Card key={plan.name} className={cn("border-accent overflow-hidden flex flex-col relative transition-all duration-500 shadow-xl", plan.isCurrent && "ring-4 ring-primary/20")}>
                        {plan.badge && <Badge className="absolute top-2 right-2 text-[8px] bg-accent">{plan.badge}</Badge>}
                        <div className={cn("p-6 flex flex-col justify-between text-center border-b min-h-[320px]", plan.name === 'Pro Yearly' ? "bg-accent/10" : plan.name === 'Visitor' ? "bg-muted/10" : "bg-primary/10")}>
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
                    <CardTitle className="font-headline text-2xl uppercase flex items-center gap-2"><HistoryIcon className="text-primary h-6 w-6" /> Residency History</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-tight">Recent Ink transactions and neural synthesis logs.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-[10px] font-bold uppercase">Timestamp</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Operation</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase text-right">Ink Spent</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {usageHistory.length > 0 ? usageHistory.map((log) => (
                                <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                                    <TableCell className="text-[10px] font-code text-muted-foreground">{getSafeTimestamp(log.timestamp)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-white uppercase">{log.action || log.flowName}</span>
                                            {log.details && <span className="text-[9px] text-muted-foreground truncate max-w-[300px]">{log.details}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-code font-bold text-primary">-{log.inkUsed || log.inkCost}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground font-code text-sm opacity-50 uppercase tracking-[0.4em]">No transaction records found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="settings" className="w-full max-w-2xl">
            <div className="space-y-8">
                <StudioProfileSection />
                {isCloudSyncActive && (
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-2"><CreditCard className="text-primary h-5 w-5"/> Billing & Subscription</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-tight">Update payment method, invoices, or cancel Pro.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button
                          className="w-full h-11 font-bold uppercase text-[10px]"
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
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-2"><UserCircle className="text-primary h-5 w-5"/> Artist Profile</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-tight">Manage your public studio identity.</CardDescription>
                    </CardHeader>
                    <CardContent><div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Stage Name</Label><div className="flex gap-2"><Input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} className="font-code font-bold h-11" /><Button onClick={() => {}} className="h-11 px-8 font-bold">Save</Button></div></div></CardContent>
                </Card>
                <Card className={cn("border-2", !isYearlyUser && "opacity-50")}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-headline text-xl">Studio API Bypass (BYO-API)</CardTitle>
                        {!isYearlyUser && <Badge variant="destructive" className="uppercase tracking-widest text-[10px]">Yearly Pro Only</Badge>}
                      </div>
                      <CardDescription className="text-xs leading-relaxed normal-case tracking-normal text-muted-foreground">
                        Connect your Google AI key for your own API quota and rate limits. Ink still applies — that is the workstation IP fee (DNA flows, guardrails, remix logic), not a second charge for model tokens.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {customApiKey && (
                        <div className="p-4 bg-accent/5 border border-accent/20 rounded-md">
                            <p className="text-xs leading-relaxed font-code text-accent font-bold"><Zap className="inline h-3 w-3 mr-1" /> Custom key active — Google bills your API usage; Bar 4 Bar Ink covers studio orchestration only.</p>
                        </div>
                        )}
                        <div className="flex gap-2">
                            <Input type="password" placeholder="AIza..." value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} className="font-mono text-sm h-11" />
                            <Button onClick={() => saveCustomApiKey(apiKeyInput)} className="h-11 px-8 font-bold">Save Key</Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/10">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl flex items-center gap-2"><Info className="text-primary h-5 w-5"/> Legal &amp; Policies</CardTitle>
                        <CardDescription className="text-xs uppercase tracking-tight">Terms, privacy, and AI use policies.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground font-code leading-relaxed">
                        <p>Using AI features means you agree to our content policies — including that AI output is assistive, unreviewed, and your responsibility to edit and clear before publishing.</p>
                        <div className="flex flex-wrap gap-3 pt-1">
                            <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase" asChild>
                                <Link href="/terms">Terms of Service</Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-9 text-[10px] font-bold uppercase" asChild>
                                <Link href="/privacy">Privacy Policy</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-500/20 bg-red-500/5">
                    <CardHeader><CardTitle className="font-headline text-xl text-red-500 flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Danger Zone</CardTitle><CardDescription className="text-xs uppercase tracking-tight text-red-700">Account eradication is permanent.</CardDescription></CardHeader>
                    <CardContent>
                        <p className="text-[10px] text-muted-foreground mb-6 uppercase tracking-wider">Deleting your studio account is permanent. This will erase all concept albums, project DNA, and saved motifs from the vault.</p>
                        <Button variant="destructive" className="w-full h-12 font-bold uppercase tracking-widest text-[10px]" onClick={() => setDeleteConfirmOpen(true)}><Trash2 className="h-4 w-4" /> Delete Studio Account</Button>
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
                      if (!user) return;
                      setIsDeletingAccount(true);
                      try {
                          await deleteDoc(doc(db, 'users', user.id));
                          await deleteUser(auth.currentUser!);
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
  );
}

export default function UsagePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader className="animate-spin h-8 w-8 text-primary" /></div>}>
      <UsagePageContent />
    </Suspense>
  );
}
