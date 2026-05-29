import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background p-4">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
        <div className="h-full w-full bg-[repeating-linear-gradient(theme(colors.border),theme(colors.border)_1px,transparent_1px,transparent_24px)]"></div>
      </div>
      
      <Card className="w-full max-w-lg text-center relative z-10 shadow-2xl border-2">
        <CardHeader className="pt-12">
          <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <Music className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-4xl font-headline font-bold">
            404: Static Silence
          </CardTitle>
          <CardDescription className="text-lg font-code mt-2">
            The track or album you're looking for isn't in the vault.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-12 space-y-6">
          <p className="text-muted-foreground max-w-xs mx-auto">
            This workstation URL might be outdated or the project has been moved to a different album.
          </p>
          <div className="flex justify-center">
            <Button size="lg" className="px-8 font-bold" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
