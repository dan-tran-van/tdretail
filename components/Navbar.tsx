'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/navigation';
import { usePathname, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Inbox,
  ShoppingBag,
  Disc,
  Mail,
  RefreshCw,
  Sparkles,
  User,
  ShieldCheck,
  Store,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Customer } from '@/lib/types';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [isResetting, setIsResetting] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const fetchSessionAndStats = async () => {
    try {
      // 1. Session
      const sessionRes = await fetch('/api/session');
      if (sessionRes.ok) {
        const data = await sessionRes.json();
        setCurrentCustomer(data.customer);
        setAvailableCustomers(data.availableCustomers || []);
      }

      // 2. Conversations count
      const convRes = await fetch('/api/conversations');
      if (convRes.ok) {
        const data = await convRes.json();
        const unread = (data.conversations || []).filter(
          (c: any) => c.status === 'active' || c.unreadByCustomer
        ).length;
        setUnreadCount(unread);
      }

      // 3. Outbox count
      const outboxRes = await fetch('/api/outbox');
      if (outboxRes.ok) {
        const data = await outboxRes.json();
        setOutboxCount((data.emails || []).length);
      }
    } catch (e) {
      console.warn('Navbar stats fetch error:', e);
    }
  };

  useEffect(() => {
    fetchSessionAndStats();
    const interval = setInterval(fetchSessionAndStats, 8000);
    return () => clearInterval(interval);
  }, [pathname]);

  const switchCustomer = async (customerId: string) => {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      if (res.ok) {
        setShowPersonaMenu(false);
        await fetchSessionAndStats();
        router.refresh();
      }
    } catch (e) {
      console.error('Error switching customer:', e);
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        await fetchSessionAndStats();
        router.refresh();
      }
    } catch (e) {
      console.error('Error resetting database:', e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Platform Title */}
        <div className="flex items-center gap-6">
          <NextLink href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-foreground">
                  TD Retail
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0 h-4 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
                >
                  Shared Platform
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Multi-Merchant AI Support & Gemini Resolution
              </span>
            </div>
          </NextLink>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NextLink href="/inbox">
              <Button
                variant={pathname === '/inbox' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2 relative"
              >
                <Inbox className="h-4 w-4" />
                <span>Customer Inbox</span>
                {unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </NextLink>

            <NextLink href="/outbox">
              <Button
                variant={pathname === '/outbox' ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                <span>Outbox Inspector</span>
                {outboxCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {outboxCount}
                  </Badge>
                )}
              </Button>
            </NextLink>

            {/* Storefront demo dropdown links */}
            <div className="flex items-center pl-2 ml-2 border-l border-border gap-1">
              <span className="text-xs text-muted-foreground mr-1 hidden lg:inline">
                Storefronts:
              </span>
              <NextLink href="/storefront/music">
                <Button
                  variant={pathname.includes('/storefront/music') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5 text-xs h-8 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                >
                  <Disc className="h-3.5 w-3.5" />
                  <span>Digital Music</span>
                </Button>
              </NextLink>

              <NextLink href="/storefront/groceries">
                <Button
                  variant={pathname.includes('/storefront/groceries') ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5 text-xs h-8 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Groceries</span>
                </Button>
              </NextLink>
            </div>
          </nav>
        </div>

        {/* Right side: Persona Switcher & Reset Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Seed Reset */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetData}
            disabled={isResetting}
            title="Reset and reseed mock orders and conversations"
            className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${isResetting ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Reset Demo</span>
          </Button>

          {/* Persona Switcher Menu */}
          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-muted/60 transition-colors text-left"
            >
              <Avatar className="h-7 w-7 border border-primary/20">
                <AvatarImage src={currentCustomer?.avatarUrl} />
                <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-semibold">
                  {currentCustomer?.name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col pr-1">
                <span className="text-xs font-semibold leading-tight text-foreground truncate max-w-[100px] sm:max-w-[120px]">
                  {currentCustomer?.name || 'Customer'}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[100px] sm:max-w-[120px]">
                  {currentCustomer?.email}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* Persona Switcher Dropdown */}
            {showPersonaMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-popover shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1.5 border-b border-border mb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Demo Persona Switcher
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4">
                      Active Session
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Switch customers to verify isolated data access and cross-merchant order lookups.
                  </p>
                </div>

                <div className="space-y-1">
                  {availableCustomers.map((cust) => {
                    const isSelected = cust.id === currentCustomer?.id;
                    return (
                      <button
                        key={cust.id}
                        onClick={() => switchCustomer(cust.id)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/20 text-foreground'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={cust.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {cust.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground truncate">
                              {cust.name}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {cust.email}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
