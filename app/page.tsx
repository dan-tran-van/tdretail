'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Sparkles,
  MessageSquare,
  Mail,
  Disc,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Layers,
  Terminal,
  Play,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Customer } from '@/lib/types';

export default function LandingPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      }
    } catch (e) {
      console.warn('Failed to fetch session', e);
    }
  };

  useEffect(() => {
    fetchSession();
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/60 text-xs font-semibold text-foreground shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>TD Retail • Gemini-Powered Multi-Merchant Resolution</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
            One Modern Chatbot.{' '}
            <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-8">
              All Merchants.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A unified conversational customer support platform. Manage inquiries across distinct merchants with a modern Gemini chat interface, collapsible sidebar navigation, live order tool grounding, and email reply integration.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <NextLink href="/chat/conv_music_01">
              <Button size="lg" className="h-11 px-6 gap-2 bg-primary text-primary-foreground shadow-xs">
                <Sparkles className="h-4 w-4" />
                <span>Launch Interactive Demo Chat</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </NextLink>

            <NextLink href="/inbox">
              <Button variant="outline" size="lg" className="h-11 px-5 gap-2 border-border">
                <MessageSquare className="h-4 w-4" />
                <span>All Conversations</span>
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
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>Active Demo Shopper:</span>
            <span className="font-semibold text-foreground">{customer?.name || 'Sarah Connor'}</span>
            <span className="font-mono text-[11px] text-muted-foreground">({customer?.email})</span>
          </div>
        </div>
      </section>

      {/* Featured Interactive Demo Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs uppercase tracking-wider text-primary">
            Quick Demos
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Jump Straight into Modern Chat Demos
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Experience our Gemini-powered chatbot interfaces with real pre-seeded order grounding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Demo 1: SoundWave Digital */}
          <Card className="border-border bg-card shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
            <CardHeader className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Disc className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">SoundWave Digital Music</CardTitle>
                    <CardDescription className="text-xs">
                      Lossless Audio, DJ Licenses & Vinyl Merch
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Order Grounded
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Test order lookups for Order #SW-10492. Gemini retrieves verified digital license keys and explains return policies directly in the modern chat drawer.
              </p>
            </CardHeader>

            <CardContent className="p-6 pt-0 flex gap-2">
              <NextLink href="/chat/conv_music_01" className="flex-1">
                <Button size="sm" className="w-full text-xs gap-1.5 bg-primary text-primary-foreground">
                  <Play className="h-3.5 w-3.5" />
                  <span>Open Music Support Chat</span>
                </Button>
              </NextLink>

              <NextLink href="/storefront/music" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 border-border">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Storefront Demo</span>
                </Button>
              </NextLink>
            </CardContent>
          </Card>

          {/* Demo 2: FreshCart Groceries */}
          <Card className="border-border bg-card shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
            <CardHeader className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">FreshCart Direct</CardTitle>
                    <CardDescription className="text-xs">
                      Artisanal Organic Foods & Same-Day Groceries
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  Fulfillment Grounded
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Test courier and cold-chain queries for Order #FC-88219. Gemini checks delivery status, driver updates, and policy-grounded refunds.
              </p>
            </CardHeader>

            <CardContent className="p-6 pt-0 flex gap-2">
              <NextLink href="/chat/conv_grocery_01" className="flex-1">
                <Button size="sm" className="w-full text-xs gap-1.5 bg-primary text-primary-foreground">
                  <Play className="h-3.5 w-3.5" />
                  <span>Open Grocery Support Chat</span>
                </Button>
              </NextLink>

              <NextLink href="/storefront/groceries" className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 border-border">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Storefront Demo</span>
                </Button>
              </NextLink>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs uppercase tracking-wider text-primary">
            Key Differentiators
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Platform Capabilities
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            How TD Retail solves fragmented multi-merchant customer service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border bg-card">
            <CardHeader className="p-6 pb-4 space-y-2">
              <div className="h-10 w-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Modern Collapsible Sidebar</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Gemini-style collapsible sidebar allowing quick switching between conversations, starting new support inquiries, and inspecting email threads.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="p-6 pb-4 space-y-2">
              <div className="h-10 w-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Grounded Gemini AI</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Server-side function calling with strict tenant boundary enforcement prevents hallucinated order states and ensures cross-merchant security.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="p-6 pb-4 space-y-2">
              <div className="h-10 w-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Email Reply Routing</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                SendGrid Inbound Parse integration matches email replies directly into conversation threads with one-click simulation in the Outbox Inspector.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Technical Architecture & Verification Checklist */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Card className="border-border bg-card">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Requirements Verification</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Built with Next.js App Router, TypeScript, shadcn/ui, and Gemini AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted border border-border">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Consolidated Chatbot Inbox</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Unified inbox and chat with expandable/collapsible sidebar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted border border-border">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Grounded Gemini Tools</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Server tool <code>lookupOrderStatus</code> validates tenant boundary before return.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted border border-border">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-foreground">Inbound & Outbound Email</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    SendGrid SDK + Inbound Parse webhook handler with Reply-To token routing.
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
