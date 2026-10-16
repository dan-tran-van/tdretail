'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  Disc,
  ShoppingBag,
  Sparkles,
  Search,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Conversation, Merchant, Order, Customer } from '@/lib/types';

export default function ConsolidatedInboxPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMerchantFilter, setSelectedMerchantFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);

      const sessRes = await fetch('/api/session');
      if (sessRes.ok) {
        const sData = await sessRes.json();
        setCustomer(sData.customer);
      }

      const convRes = await fetch('/api/conversations');
      if (convRes.ok) {
        const cData = await convRes.json();
        setConversations(cData.conversations || []);
      }

      const merchRes = await fetch('/api/merchants');
      if (merchRes.ok) {
        const mData = await merchRes.json();
        setMerchants(mData.merchants || []);
      }
    } catch (err) {
      console.error('Error fetching inbox conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredConversations = conversations.filter((conv) => {
    if (selectedMerchantFilter !== 'all' && conv.merchantId !== selectedMerchantFilter) {
      return false;
    }
    if (selectedStatusFilter !== 'all' && conv.status !== selectedStatusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = conv.subject.toLowerCase().includes(q);
      const matchMerchant = (conv.merchantName || '').toLowerCase().includes(q);
      const matchSnippet = conv.lastMessageSnippet.toLowerCase().includes(q);
      return matchSubject || matchMerchant || matchSnippet;
    }
    return true;
  });

  const activeCount = conversations.filter((c) => c.status === 'active').length;
  const escalatedCount = conversations.filter((c) => c.status === 'escalated').length;
  const resolvedCount = conversations.filter((c) => c.status === 'resolved').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Support Inbox
                </h1>
                <Badge variant="outline" className="text-xs">
                  {conversations.length} Threads
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                All merchant conversations in one unified inbox with Gemini AI resolution and order grounding.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-2 self-start sm:self-auto text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Active AI
                  </p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{activeCount}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Escalated
                  </p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{escalatedCount}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-xs">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Resolved
                  </p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{resolvedCount}</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-2 rounded-xl bg-card border border-border">
            {/* Merchant Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={selectedMerchantFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMerchantFilter('all')}
                className="text-xs h-7 px-2.5 rounded-lg"
              >
                All
              </Button>

              {merchants.map((m) => {
                const isSelected = selectedMerchantFilter === m.id;
                const isMusic = m.id === 'merchant_music';

                return (
                  <Button
                    key={m.id}
                    variant={isSelected ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedMerchantFilter(m.id)}
                    className="text-xs h-7 px-2.5 rounded-lg gap-1.5"
                  >
                    {isMusic ? (
                      <Disc className="h-3 w-3" />
                    ) : (
                      <ShoppingBag className="h-3 w-3" />
                    )}
                    <span>{m.name}</span>
                  </Button>
                );
              })}
            </div>

            {/* Status and Search */}
            <div className="flex items-center gap-2">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="h-7 rounded-lg border border-border bg-background px-2 text-xs focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
              </select>

              <div className="relative flex-1 sm:w-48">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter inquiries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 pl-8 text-xs rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Conversation List Cards */}
          <div className="space-y-2.5 pb-8">
            {loading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground border-dashed">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-foreground">No conversations match your filter</p>
                <p className="text-xs mt-1">Use the sidebar "New Inquiry" button to start a thread.</p>
              </Card>
            ) : (
              filteredConversations.map((conv) => {
                const isMusic = conv.merchantId === 'merchant_music';

                return (
                  <NextLink key={conv.id} href={`/chat/${conv.id}`}>
                    <Card className="group hover:border-primary/50 transition-all cursor-pointer border-border bg-card shadow-xs">
                      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className="p-2.5 rounded-xl bg-muted text-foreground shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {isMusic ? (
                              <Disc className="h-4 w-4" />
                            ) : (
                              <ShoppingBag className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-xs text-foreground">
                                {conv.merchantName}
                              </span>

                              {conv.orderId && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono">
                                  Order #{conv.orderId}
                                </Badge>
                              )}

                              {conv.status === 'active' && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary mr-1 animate-pulse" />
                                  Active AI
                                </Badge>
                              )}

                              {conv.status === 'escalated' && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                  Escalated
                                </Badge>
                              )}

                              {conv.status === 'resolved' && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-primary" />
                                  Resolved
                                </Badge>
                              )}
                            </div>

                            <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                              {conv.subject}
                            </h4>

                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              <span className="font-medium text-foreground/80">
                                {conv.lastMessageSender === 'ai'
                                  ? 'Gemini: '
                                  : conv.lastMessageSender === 'human_agent'
                                  ? 'Human Specialist: '
                                  : 'You: '}
                              </span>
                              {conv.lastMessageSnippet}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-auto shrink-0 gap-1.5 text-muted-foreground pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                            <span>Open Thread</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </NextLink>
                );
              })
            )}
          </div>
        </div>
    </div>
  );
}
