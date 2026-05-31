'use client';

import Link from 'next/link';
import { LogOut, LayoutDashboard, HelpCircle, ChevronLeft, ChevronRight, Clock, Star, Droplets, Zap, Shield, Timer, Trophy } from 'lucide-react';
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
import { useRouter, useParams } from 'next/navigation';
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
import { PRO_MONTHLY_INK, PRO_YEARLY_INK } from '@/lib/studio-tiers';
import { HowToUseDialog } from './how-to-use-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { isGenerating, generatingMessage } = useUIState();
  const { inkBalance, residencyBalance, purchasedBalance } = useUsage();
  const [progress, setProgress] = useState(0);

  const albumId = params?.albumId as string;
  const trackId = params?.trackId as string;

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

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {progress > 0 && progress < 100 && (
          <div className="absolute bottom-0 left-0 w-full h-[2px] z-50 overflow-hidden bg-amber-950/30">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 transition-[width] duration-300 ease-out shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                style={{ width: `${progress}%` }}
              />
          </div>
      )}
      <div className="relative h-14 w-full grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-6">
            <div className="flex items-center justify-start gap-4 min-w-0">
                {albumId && trackId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push(`/albums/${albumId}`)} 
                    className="h-9 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-all hover:bg-primary/5 shrink-0"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Album
                  </Button>
                )}
                <div className={cn(
                  "flex items-center gap-3 text-[10px] text-primary transition-all duration-300 min-w-0", 
                  isGenerating ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden'
                )}>
                    <StudioLoader size="sm" />
                    <span className="hidden lg:inline font-code uppercase tracking-tighter truncate max-w-[100px]">{generatingMessage}</span>
                </div>
            </div>
            
            <div className="flex justify-center items-center overflow-hidden">
                <Link href="/" className="flex items-center space-x-3 text-center group whitespace-nowrap">
                    <div className="bg-black rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0 border border-primary/20 w-11 h-11 overflow-hidden flex items-center justify-center p-0.5">
                        <img src="/Logo.png" alt="Bar 4 Bar" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="font-bold font-headline text-lg md:text-xl leading-none tracking-tight">Bar 4 Bar</span>
                        <p className="hidden xs:block text-[7px] md:text-[8px] text-muted-foreground font-tagline -mt-0.5 uppercase tracking-widest opacity-70">Studio Rhyme Book</p>
                    </div>
                </Link>
            </div>

          <nav className="flex items-center justify-end space-x-1 md:space-x-2 min-w-0">
            <TooltipProvider>
            {!loading && user && (
              <>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 md:h-9 w-8 md:w-9 text-primary hover:bg-primary/10" onClick={() => setGuideOpen(true)}>
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
                                <Progress value={(residencyBalance / (isYearly ? PRO_YEARLY_INK : PRO_MONTHLY_INK)) * 100} className="h-1 bg-primary/10" />
                                <p className="text-[8px] text-muted-foreground italic uppercase">Monthly Refill Pool - Prioritized</p>
                            </div>
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
                            "h-8 w-8 md:h-9 md:w-9 border transition-all duration-500 group-hover:scale-105",
                            isYearly 
                              ? "border-accent ring-2 ring-accent ring-offset-2 ring-offset-background shadow-[0_0_15px_rgba(217,70,239,0.5)]" 
                              : (isPro ? "border-primary shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "border-orange-500 shadow-sm")
                        )}>
                          {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName} />}
                          <AvatarFallback className="text-[10px] md:sm bg-muted">{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                            <Badge className={cn(
                                "h-4 px-1 text-[8px] font-bold uppercase tracking-tighter border shadow-sm",
                                isPro 
                                  ? (isYearly ? "bg-accent text-white border-accent/20" : "bg-primary text-white border-primary-foreground/20") 
                                  : "bg-orange-500 text-white border-orange-600"
                            )}>
                                {isPro ? (isYearly ? 'YEARLY' : 'PRO') : 'FREE'}
                            </Badge>
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-bold leading-none">{user.displayName}</p>
                          <p className="text-[10px] leading-none text-muted-foreground font-code">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/')}><LayoutDashboard className="mr-2 h-4 w-4" /><span>Dashboard</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/studio-progress')}><Trophy className="mr-2 h-4 w-4 text-amber-400" /><span>Studio Progress</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/usage')}><Droplets className="mr-2 h-4 w-4" /><span>Ink Store & Settings</span></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/usage?tab=cloud')}><Star className="mr-2 h-4 w-4 text-pink-400" /><span>Studio Tier</span></DropdownMenuItem>
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
    </header>
    <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
    <HowToUseDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
