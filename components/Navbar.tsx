'use client';

import React from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, MessageSquare, Mail, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const pathname = usePathname();
  const isChatView = pathname?.startsWith('/chat');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand Logo & Platform Title */}
        <div className="flex items-center gap-3">
          <NextLink href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center shadow-xs group-hover:opacity-90 transition-opacity">
              {/* <Sparkles className="h-4 w-4" /> */}
              TD
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-foreground">
                Retail
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline border-l border-border pl-2">
                Customer Support AI
              </span>
            </div>
          </NextLink>
        </div>

        {/* Minimal Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          <NextLink href="/inbox">
            <Button
              variant={pathname?.startsWith('/inbox') || isChatView ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat & Inbox</span>
            </Button>
          </NextLink>

          <NextLink href="/outbox">
            <Button
              variant={pathname === '/outbox' ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Outbox</span>
            </Button>
          </NextLink>

          <NextLink href="/storefront/groceries" className="hidden sm:inline-flex">
            <Button
              variant={pathname?.startsWith('/storefront') ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <Store className="h-3.5 w-3.5" />
              <span>Storefronts</span>
            </Button>
          </NextLink>
        </div>
      </div>
    </header>
  );
}
