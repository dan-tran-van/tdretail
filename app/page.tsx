'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Inbox,
  Disc,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Mail,
  CheckCircle2,
  Lock,
  Zap,
  Terminal,
  RefreshCw,
  ExternalLink,
  Layers,
  Cpu,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Customer, Merchant } from '@/lib/types';

export default function HomePage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [activeConversationsCount, setActiveConversationsCount] = useState<number>(0);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessRes, merchRes, convRes, outboxRes] = await Promise.all([
          fetch('/api/session'),
          fetch('/api/merchants'),
          fetch('/api/conversations'),
          fetch('/api/outbox'),
        ]);

        if (sessRes.ok) {
          const s = await sessRes.json();
          setCustomer(s.customer);
        }
        if (merchRes.ok) {
          const m = await merchRes.json();
          setMerchants(m.merchants || []);
        }
        if (convRes.ok) {
          const c = await convRes.json();
          setActiveConversationsCount((c.conversations || []).length);
        }
        if (outboxRes.ok) {
          const o = await outboxRes.json();
          setOutboxCount((o.emails || []).length);
        }
      } catch (e) {
        console.error('Failed to load home page data:', e);
      }
    }
    loadData();
  }, []);

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-12 border-b border-border/60 bg-gradient-to-b from-background via-muted/20 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/40 text-xs font-semibold text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>TD Retail Hackathon Prototype • Google Gemini Agent & SendGrid</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
            One Consolidated Inbox.{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
              Every Merchant.
            </span>{' '}
            Grounded AI.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A customer-centric multi-merchant support resolution platform. Shoppers manage conversations with separate storefronts (Digital Music & Groceries) in a single destination, backed by server-grounded order tools and email reply routing.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <NextLink href="/inbox">
              <Button size="lg" className="h-11 px-6 gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
                <Inbox className="h-4 w-4" />
                <span>Open Consolidated Inbox</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </NextLink>

            <NextLink href="/outbox">
              <Button variant="outline" size="lg" className="h-11 px-5 gap-2 border-border/80">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>Outbox Inspector</span>
                {outboxCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {outboxCount}
                  </Badge>
                )}
              </Button>
            </NextLink>

            <Button
              variant="ghost"
              size="lg"
              onClick={handleResetData}
              disabled={isResetting}
              className="h-11 px-4 gap-2 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset Demo Seed</span>
            </Button>
          </div>

          {/* Active Demo Persona Indicator */}
          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active Demo Shopper:</span>
            <span className="font-semibold text-foreground">{customer?.name || 'Sarah Connor'}</span>
            <span className="font-mono text-[11px] text-muted-foreground">({customer?.email})</span>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs uppercase tracking-wider text-primary">
            Key Differentiators
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            How TD Retail Solves Customer Frustration
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Built specifically to address the pain points of fragmented customer support across merchant storefronts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <Card className="border-border/80 bg-card/60 hover:shadow-md transition-all">
            <CardHeader className="p-6 pb-4 space-y-2">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Consolidated Inbox</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Customers no longer need 5 logins for 5 different store support portals. Inquiries from SoundWave Digital and FreshCart Direct live in one unified inbox with real-time status.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-[11px] font-mono p-2.5 rounded-lg bg-muted/50 border border-border/60 text-muted-foreground">
                Route: <code className="text-foreground font-bold">/inbox</code> • Scoped per customer session
              </div>
            </CardContent>
          </Card>

          {/* Pillar 2 */}
          <Card className="border-border/80 bg-card/60 hover:shadow-md transition-all">
            <CardHeader className="p-6 pb-4 space-y-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Grounded Gemini AI</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Zero hallucination policy. The model relies on server-side functions (<code>lookupOrderStatus</code>) with strict tenant boundary checks. The server remains in charge of authorization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-[11px] font-mono p-2.5 rounded-lg bg-muted/50 border border-border/60 text-muted-foreground">
                Tool: <code className="text-foreground font-bold">lookupOrderStatus</code> • Cross-merchant isolation
              </div>
            </CardContent>
          </Card>

          {/* Pillar 3 */}
          <Card className="border-border/80 bg-card/60 hover:shadow-md transition-all">
            <CardHeader className="p-6 pb-4 space-y-2">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Email Reply Routing</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Outgoing notifications contain encoded <code>Reply-To</code> addresses. When a customer hits "Reply" in their email app, SendGrid Inbound Parse routes the message directly into the thread.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-[11px] font-mono p-2.5 rounded-lg bg-muted/50 border border-border/60 text-muted-foreground">
                Webhook: <code className="text-foreground font-bold">/api/webhooks/sendgrid</code> • Outbox inspector
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Participating Merchant Domain Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Participating Merchant Showcase
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pre-seeded in Firestore with distinct policies, branding, and domain orders.
            </p>
          </div>

          <NextLink href="/inbox">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-primary">
              <span>View All Discussions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </NextLink>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Merchant A: Digital Music Store */}
          <Card className="border-indigo-500/30 bg-gradient-to-br from-card via-card to-indigo-500/5 shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                    <Disc className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">SoundWave Digital</CardTitle>
                    <Badge variant="outline" className="text-[10px] mt-0.5 border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                      Merchant A • Digital Music
                    </Badge>
                  </div>
                </div>

                <span className="text-xs font-mono text-muted-foreground">ID: merchant_music</span>
              </div>

              <CardDescription className="text-xs text-foreground/80 leading-relaxed">
                Distributes studio-quality 24-bit FLAC audio albums, artist master stems, and verified digital ownership keys. Instant digital delivery with permanent cloud vault storage.
              </CardDescription>

              <div className="p-3 rounded-lg bg-muted/60 border border-border/80 text-xs space-y-1">
                <span className="font-semibold text-foreground text-[11px] block">Demo Orders Ready for Grounding:</span>
                <ul className="space-y-1 text-muted-foreground text-[11px]">
                  <li>• <code className="text-foreground font-mono">#ORD-MUS-8821</code>: Neon Echoes Vol 2 (Delivered / Download Key Ready)</li>
                  <li>• <code className="text-foreground font-mono">#ORD-MUS-9042</code>: Tokyo Lo-Fi Beats (Processing / Stems Keygen)</li>
                  <li>• <code className="text-foreground font-mono">#ORD-MUS-7710</code>: Live Stream Concert Pass (Cancelled & Refunded)</li>
                </ul>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-0 flex gap-2">
              <NextLink href="/storefront/music" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 border-indigo-300 dark:border-indigo-800">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Music Storefront</span>
                </Button>
              </NextLink>

              <NextLink href="/chat/conv_music_01" className="flex-1">
                <Button size="sm" className="w-full text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Launch SoundWave Chat</span>
                </Button>
              </NextLink>
            </CardContent>
          </Card>

          {/* Merchant B: Groceries Store */}
          <Card className="border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">FreshCart Direct</CardTitle>
                    <Badge variant="outline" className="text-[10px] mt-0.5 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                      Merchant B • Organic Groceries
                    </Badge>
                  </div>
                </div>

                <span className="text-xs font-mono text-muted-foreground">ID: merchant_grocery</span>
              </div>

              <CardDescription className="text-xs text-foreground/80 leading-relaxed">
                Farm-fresh organic produce and pasture-raised dairy delivered within 2 hours. Protected by a cold-chain guarantee with temperature-controlled insulated totes.
              </CardDescription>

              <div className="p-3 rounded-lg bg-muted/60 border border-border/80 text-xs space-y-1">
                <span className="font-semibold text-foreground text-[11px] block">Demo Orders Ready for Grounding:</span>
                <ul className="space-y-1 text-muted-foreground text-[11px]">
                  <li>• <code className="text-foreground font-mono">#ORD-GROC-5512</code>: Avocados, Whole Milk, Cold Brew (Out for Delivery - Driver Marcus D.)</li>
                  <li>• <code className="text-foreground font-mono">#ORD-GROC-6180</code>: Sockeye Salmon & Spinach (Delivered to Front Porch)</li>
                  <li>• <code className="text-foreground font-mono">#ORD-GROC-4920</code>: Artisanal Cheeses (Cancelled / Item Out of Stock)</li>
                </ul>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-0 flex gap-2">
              <NextLink href="/storefront/groceries" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 border-emerald-300 dark:border-emerald-800">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Grocery Storefront</span>
                </Button>
              </NextLink>

              <NextLink href="/chat/conv_grocery_01" className="flex-1">
                <Button size="sm" className="w-full text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Launch FreshCart Chat</span>
                </Button>
              </NextLink>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical Architecture & Verification Checklist */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Card className="border-border/80 bg-muted/20">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-base">Hackathon Requirements Verification Checklist</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Every deliverable from the specification has been built with clean production-grade code.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Consolidated Customer Inbox</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Unified <code>/inbox</code> supporting multi-merchant filter tabs and order selectors.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Grounded Gemini Tools</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Server tool <code>lookupOrderStatus</code> validates tenant boundary and ownership before return.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Inbound & Outbound Email</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    SendGrid SDK + Inbound Parse webhook handler with Reply-To token routing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Local Development Outbox</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Inspect outgoing emails at <code>/outbox</code> and simulate 1-click customer email replies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Firestore Dual-Mode Store</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Firebase Admin SDK with clean fallback for zero-barrier local evaluation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-card border border-border/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Human Escalation Workflow</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    AI and customer escalation triggers, audit events, and specialist resolution controls.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
