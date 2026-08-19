'use client';

import Link from 'next/link';
import { LogOut, LayoutDashboard, LayoutGrid, HelpCircle, ChevronLeft, ChevronRight, Clock, Star, Droplets, Zap, Shield, Timer, Trophy, Smartphone, Settings, Users, Archive, Bell, Banknote, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import { signOut } from 'firebase/auth';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useState, useEffect } from 'react';
import { useUIState } from '@/hooks/use-ui-state';
import { cn } from '@/lib/utils';
import { useUsage } from '@/context/usage-context';
import { StudioLoader } from '@/components/studio-loader';
import { BugReportDialog } from './bug-report-dialog';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { getResidencyPoolCap, getResidencyProgressPercent, getVisitorPoolHeaderCaption } from '@/lib/studio-tiers';
import { InkRefillCountdown } from '@/components/ink-refill-countdown';
import { HowToUseDialog } from './how-to-use-dialog';
import { ActivityNavDropdown } from '@/components/activity/activity-nav-dropdown';
import { FoldNavButton } from '@/components/folds/fold-nav-button';
import { useFoldInbox } from '@/components/folds/fold-inbox-provider';
import { useFoldsFeature } from '@/hooks/use-folds-feature';
import { isMobileInstallPlatform, isStandalonePwa, requestPwaInstallPrompt } from '@/lib/pwa-install';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BrandLockup } from '@/components/brand-lockup';
import { StudioThemeControls } from '@/components/studio-theme-controls';
import { isTrackLyricSheetPath } from '@/lib/studio-theme';
import { useSocialAlerts } from '@/hooks/use-social-alerts';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { isGuestTryAlbumId, isGuestTrySheetEnabled } from '@/lib/guest-try';
import { SCENE_HOME_ENABLED, VAULT_PATH } from '@/lib/scene-home';
import { getGuestSignupHref, trackGuestSignupCta } from '@/lib/guest-funnel-client';
import { prepareGuestTrackForSignup } from '@/lib/guest-track-session';
import { getStoredMarketingRef } from '@/lib/marketing-attribution';
import {
  studioAvatarRingClass,
  studioChromeFromUser,
  studioHeaderBadgeClass,
  studioNameClass,
  studioTierMenuClass,
} from '@/lib/studio-tier-chrome';
import { useOptionalDropPlayer } from '@/context/drop-player-context';
import { TopNavDropMiniPlayer } from '@/components/top-nav-drop-mini-player';

export function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { toast } = useToast();
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { isGenerating, generatingMessage } = useUIState();
  const { inkBalance, residencyBalance, trialInkBalance, purchasedBalance } = useUsage();
  const { total: blockAlerts } = useSocialAlerts();
  const { unread: foldUnread } = useFoldInbox();
  const { enabled: foldsOn } = useFoldsFeature();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const dropPlayer = useOptionalDropPlayer();
  const [progress, setProgress] = useState(0);
  const [showPwaInstallMenu, setShowPwaInstallMenu] = useState(false);

  useEffect(() => {
    setShowPwaInstallMenu(isMobileInstallPlatform() && !isStandalonePwa());
  }, []);

  const albumId = params?.albumId as string;
  const trackId = params?.trackId as string;
  const isLyricSheet = isTrackLyricSheetPath(pathname);
  const isGuestTry =
    !user && isGuestTrySheetEnabled() && isGuestTryAlbumId(albumId);
  const backHref = isGuestTry ? '/welcome' : albumId ? `/albums/${albumId}` : '/';
  const signupHref = getGuestSignupHref({
    marketingRef: getStoredMarketingRef(),
  });

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
        setProgress(0);
        interval = setInterval(() => {
            setProgress(prev => (prev >= 95 ? 95 : prev + (100 - prev) * 0.1));
        }, 300);
    } else {
        setProgress(100);
        const timer = setTimeout(() => setProgress(0), 500);
        return () => clearTimeout(timer);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Sign Out Error' });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'A';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : name[0];
  };
  
  const isPro = user?.subscriptionStatus === 'active';
  const isYearly = user?.subscriptionTier === 'yearly';
  const studioChrome = studioChromeFromUser(user);
  const residencyPoolCap = getResidencyPoolCap(user);
  const residencyProgress = getResidencyProgressPercent(residencyBalance, residencyPoolCap);

  return (
    <>
    <header data-app-header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 left-0 w-full h-[2px] z-50 overflow-hidden bg-amber-950/30">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 transition-[width] duration-300 ease-out shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                style={{ width: `${progress}%` }}
              />
          </div>
      )}
      <div data-app-header-bar className="relative h-14 w-full px-2 sm:px-4 md:px-6">
            {/* Logo centered — tablet/desktop only (mobile uses left column to avoid theme-toggle overlap) */}
            <div className="pointer-events-none absolute inset-0 z-20 hidden md:flex items-center justify-center px-24 lg:px-32">
                <BrandLockup variant="app" className="pointer-events-auto min-w-0 max-w-full" />
            </div>

            <div className="relative z-10 flex h-14 items-center justify-between gap-1 min-w-0 pointer-events-none [&_button]:pointer-events-auto [&_a]:pointer-events-auto">
            <div className="flex items-center justify-start gap-1 sm:gap-2 min-w-0 flex-1 basis-0 max-w-[58%] sm:max-w-[62%] md:max-w-none pointer-events-none [&>*]:pointer-events-auto">
                {albumId && trackId && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => router.push(backHref)} 
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary transition-all hover:bg-primary/5 md:hidden"
                    aria-label={isGuestTry ? 'About Bar 4 Bar' : 'Back to album'}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <BrandLockup variant="app" className="min-w-0 flex-1 md:hidden max-w-full overflow-hidden" />
                {albumId && trackId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push(backHref)} 
                    className="hidden md:inline-flex h-9 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all hover:bg-primary/5 shrink-0"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> {isGuestTry ? 'About' : 'Back to Album'}
                  </Button>
                )}                <div className={cn(
                  "flex items-center gap-3 text-[10px] text-primary transition-all duration-300 min-w-0", 
                  isGenerating ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden'
                )}>
                    <StudioLoader size="sm" />
                    <span className="hidden lg:inline font-code uppercase tracking-tighter truncate max-w-[100px]">{generatingMessage}</span>
                </div>
            </div>

          <nav className="flex items-center justify-end gap-0.5 sm:gap-1 md:gap-2 min-w-0 flex-1 basis-0 max-w-[42%] sm:max-w-[38%] md:max-w-none shrink-0 pointer-events-none [&>*]:pointer-events-auto">
            <TooltipProvider>
            {!loading && !user && isGuestTry && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hidden sm:inline-flex"
                  onClick={() => router.push('/welcome')}
                >
                  About
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px] font-bold uppercase tracking-wide"
                  onClick={() => router.push('/login')}
                >
                  Log in
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-[10px] font-bold uppercase tracking-wide bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
                  onClick={() => {
                    trackGuestSignupCta('header');
                    prepareGuestTrackForSignup();
                    router.push(signupHref);
                  }}
                >
                  Sign up
                </Button>
              </>
            )}
            {!loading && user && (
              <>
                {isLyricSheet ? <StudioThemeControls /> : null}
                {SCENE_HOME_ENABLED && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative h-8 w-8 shrink-0 md:h-9 md:w-9">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative h-full w-full text-sky-400 hover:bg-sky-500/10"
                          onClick={() => router.push(VAULT_PATH)}
                          aria-label="The Vault"
                        >
                          <Archive className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-1/2 top-[calc(100%-2px)] -translate-x-1/2 text-[7px] font-bold uppercase leading-none tracking-[0.14em] text-white"
                        >
                          vault
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>The Vault</p></TooltipContent>
                  </Tooltip>
                )}
                <FoldNavButton />
                <ActivityNavDropdown unreadCount={blockAlerts} />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 md:h-9 w-8 md:w-9 text-primary hover:bg-primary/10 shrink-0" onClick={() => setGuideOpen(true)}>
                            <HelpCircle className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Studio Manual</p></TooltipContent>
                </Tooltip>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" data-tour="ink-balance" className="h-8 md:h-9 gap-1.5 md:gap-2 font-code px-2 md:px-3 border-primary/20 hover:bg-primary/5 transition-all">
                            <Droplets className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary shrink-0"/>
                            <span className="text-xs md:text-sm">{inkBalance.toLocaleString()}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0 bg-card border-2 shadow-2xl overflow-hidden" align="end">
                        <div className="p-4 border-b bg-muted/30">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2"><Zap className="h-3 w-3" /> Studio Capacity Deck</h4>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Clock className="h-2.5 w-2.5" /> Residency Ink</span>
                                    <span className="text-xs font-bold font-code">{residencyBalance.toLocaleString()}</span>
                                </div>
                                <Progress value={residencyProgress} className="h-1 bg-primary/10" />
                                <p className="text-[8px] text-muted-foreground italic uppercase">
                                  {isPro ? 'Monthly residency pool' : getVisitorPoolHeaderCaption()}
                                </p>
                                {!isPro && user && (
                                  <InkRefillCountdown compact className="italic uppercase" />
                                )}
                            </div>
                            {trialInkBalance > 0 && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Timer className="h-2.5 w-2.5" /> Trial Ink
                                  </span>
                                  <span className="text-xs font-bold font-code text-sky-400">{trialInkBalance.toLocaleString()}</span>
                                </div>
                                <div className="h-1 w-full bg-sky-500/20 rounded-full">
                                  <div className="h-full bg-sky-400 rounded-full" style={{ width: '100%' }} />
                                </div>
                                <p className="text-[8px] text-muted-foreground italic uppercase">Legacy trial bonus</p>
                              </div>
                            )}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Star className="h-2.5 w-2.5" /> Permanent Ink</span>
                                    <span className="text-xs font-bold font-code">{purchasedBalance.toLocaleString()}</span>
                                </div>
                                <div className="h-1 w-full bg-orange-500/20 rounded-full">
                                    <div className="h-full bg-orange-500 rounded-full" style={{ width: purchasedBalance > 0 ? '100%' : '0%' }} />
                                </div>
                                <p className="text-[8px] text-muted-foreground italic uppercase">Lifetime use balance</p>
                            </div>
                        </div>
                        <div className="p-3 bg-primary/5 border-t">
                            <Button variant="ghost" size="sm" className="w-full h-8 text-[9px] font-bold uppercase tracking-widest gap-2" onClick={() => router.push('/usage')}>
                                Manage Ink Packs <ChevronRight className="h-3 w-3" />
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="relative cursor-pointer group ml-1">
                        <Avatar className={cn(
                            "h-8 w-8 md:h-9 md:w-9 transition-all duration-500 group-hover:scale-105",
                            studioAvatarRingClass(studioChrome)
                        )}>
                          {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName} />}
                          <AvatarFallback className="text-[10px] md:sm bg-muted">{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                            <Badge className={cn(
                                "h-4 px-1 text-[8px] font-bold uppercase tracking-tighter border shadow-sm",
                                studioHeaderBadgeClass(studioChrome, isYearly)
                            )}>
                                {isPro ? (isYearly ? 'YEARLY' : 'PRO') : 'FREE'}
                            </Badge>
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 [&_[role=menuitem]]:focus:bg-amber-400/25 [&_[role=menuitem]]:focus:text-foreground"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className={cn("text-sm font-bold leading-none", studioNameClass(studioChrome))}>{user.displayName}</p>
                          <p className="text-[10px] leading-none text-muted-foreground font-code">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span className="flex-1">{SCENE_HOME_ENABLED ? 'The Scene (Home)' : 'Dashboard'}</span>
                      </DropdownMenuItem>
                      {SCENE_HOME_ENABLED && (
                        <DropdownMenuItem onClick={() => router.push(VAULT_PATH)}><Archive className="mr-2 h-4 w-4 text-sky-400" /><span>The Vault</span></DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="md:hidden" onClick={() => setGuideOpen(true)}><HelpCircle className="mr-2 h-4 w-4 text-primary" /><span>Studio Manual</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/studio-progress')}><Trophy className="mr-2 h-4 w-4 text-amber-400" /><span>Studio Progress</span></DropdownMenuItem>
                      {foldsOn ? (
                      <DropdownMenuItem onClick={() => router.push('/folds')}>
                        <MessageSquare className="mr-2 h-4 w-4 text-amber-400" />
                        <span className="flex-1">Msgs</span>
                        {foldUnread > 0 && (
                          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-black">
                            {foldUnread > 99 ? '99+' : foldUnread}
                          </span>
                        )}
                      </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => router.push('/activity')}>
                        <Bell className="mr-2 h-4 w-4 text-emerald-400" />
                        <span className="flex-1">Activity</span>
                        {blockAlerts > 0 && (
                          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-black">
                            {blockAlerts > 99 ? '99+' : blockAlerts}
                          </span>
                        )}
                      </DropdownMenuItem>
                      {!SCENE_HOME_ENABLED && (
                        <DropdownMenuItem onClick={() => router.push('/feed')}>
                          <Users className="mr-2 h-4 w-4 text-emerald-400" />
                          <span className="flex-1">The Block</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => router.push('/friends')}>
                        <Users className="mr-2 h-4 w-4 text-sky-400" />
                        <span>Your circle</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/usage?tab=buy-ink')}><LayoutGrid className="mr-2 h-4 w-4 text-primary" /><span>Ink Store</span></DropdownMenuItem>
                      {firstDropsOn ? (
                        <DropdownMenuItem onClick={() => router.push('/earnings')}>
                          <Banknote className="mr-2 h-4 w-4 text-emerald-400" />
                          <span>Earnings</span>
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => router.push('/usage?tab=settings')}><Settings className="mr-2 h-4 w-4" /><span>Settings</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/usage?tab=cloud')}>
                        <Star className={cn('mr-2 h-4 w-4', studioTierMenuClass(studioChrome))} />
                        <span className={studioTierMenuClass(studioChrome)}>Studio Tier</span>
                      </DropdownMenuItem>
                      {showPwaInstallMenu && (
                        <DropdownMenuItem className="md:hidden" onClick={() => requestPwaInstallPrompt()}>
                          <Smartphone className="mr-2 h-4 w-4 text-primary" /><span>Add to Home Screen</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {user.role === 'admin' && (<DropdownMenuItem onClick={() => router.push('/admin')} className="text-primary font-bold"><Shield className="mr-2 h-4 w-4" /><span>Admin Panel</span></DropdownMenuItem>)}
                      <DropdownMenuItem onClick={() => setBugReportOpen(true)} className="text-muted-foreground"><HelpCircle className="mr-2 h-4 w-4" /><span>Report an Issue</span></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10">
                        <LogOut className="mr-2 h-4 w-4" /><span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            </TooltipProvider>
          </nav>
            </div>
      </div>
      {dropPlayer?.current ? <TopNavDropMiniPlayer /> : null}
    </header>
    <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    <HowToUseDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
