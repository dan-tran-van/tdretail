'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ModernAppShell } from '@/components/ModernAppShell';

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide global navbar and footer on chat pages, inbox, and outbox
  const isFullAppPage =
    pathname?.startsWith('/chat') ||
    pathname?.startsWith('/inbox') ||
    pathname?.startsWith('/outbox');

  if (isFullAppPage) {
    return (
      <ModernAppShell>
        {children}
      </ModernAppShell>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground bg-card/40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">TD Retail Platform</span>
            <span>•</span>
            <span>Multi-Merchant Customer Resolution Engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Grounded Gemini 2.5 Flash
            </span>
            <span>•</span>
            <span>SendGrid Inbound Parse</span>
            <span>•</span>
            <span>Firestore Multi-Tenant</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Suspense fallback={<main className="h-screen w-screen bg-background flex flex-col">{children}</main>}>
        <ShellContent>{children}</ShellContent>
      </Suspense>
    </TooltipProvider>
  );
}
