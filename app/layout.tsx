import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { Navbar } from '@/components/Navbar';
import { TooltipProvider } from '@/components/ui/tooltip';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TD Retail | Shared Customer Support Platform & Gemini Agent',
  description:
    'Consolidated multi-merchant customer support inbox powered by Google Gemini, server-grounded order tools, and SendGrid email reply routing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-indigo-500/20">
        <TooltipProvider>
          <Suspense fallback={<div className="h-16 w-full border-b border-border bg-background" />}>
            <Navbar />
          </Suspense>
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
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Grounded Gemini 2.5 Flash
                </span>
                <span>•</span>
                <span>SendGrid Inbound Parse</span>
                <span>•</span>
                <span>Firestore Multi-Tenant</span>
              </div>
            </div>
          </footer>
        </TooltipProvider>
      </body>
    </html>
  );
}
