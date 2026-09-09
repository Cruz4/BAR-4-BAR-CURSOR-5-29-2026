import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Compass, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[#060a14]" />
        <div className="absolute -left-[18%] top-[-8%] h-[52%] w-[62%] rounded-full bg-fuchsia-500/14 blur-[110px]" />
        <div className="absolute -right-[12%] top-[8%] h-[44%] w-[54%] rounded-full bg-cyan-400/12 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(244,114,182,0.08),transparent_68%)]" />
      </div>

      <Card className="relative z-10 w-full max-w-lg border-2 border-white/10 bg-[#07111f]/80 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <CardHeader className="pt-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 via-fuchsia-500/10 to-violet-600/15 shadow-[0_0_32px_rgba(56,189,248,0.15)]">
            <span className="text-4xl leading-none" aria-hidden>👋</span>
          </div>
          <p className="font-code text-[10px] font-bold uppercase tracking-[0.28em] text-sky-300/80">
            404 · Page not found
          </p>
          <CardTitle className="mt-3 font-headline text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            This page isn&apos;t here
          </CardTitle>
          <CardDescription className="mx-auto mt-3 max-w-sm text-base leading-relaxed">
            The link may be broken, expired, or mistyped. No stress — AKAsheet is still open.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <p className="mx-auto flex max-w-xs items-center justify-center gap-2 font-code text-[11px] uppercase tracking-wider text-muted-foreground/80">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-300/80" />
            Try home or Discover
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="px-7 font-bold" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to The Scene
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-sky-400/30 px-7 font-bold text-sky-200 hover:bg-sky-500/10" asChild>
              <Link href="/discover">
                <Compass className="mr-2 h-5 w-5" />
                Discover
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
