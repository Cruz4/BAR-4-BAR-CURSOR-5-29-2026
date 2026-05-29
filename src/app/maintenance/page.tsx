'use client';

import { HardHat } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <HardHat className="h-24 w-24 text-primary animate-pulse" />
      <h1 className="mt-8 text-4xl font-headline font-bold">Under Maintenance</h1>
      <p className="mt-4 text-lg text-muted-foreground font-code">
        Bar 4 Bar is currently undergoing some scheduled maintenance.
        <br />
        We'll be back online shortly. Thank you for your patience.
      </p>
    </div>
  );
}
