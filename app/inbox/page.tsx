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
  Filter,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Store,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Conversation, Merchant, Order, Customer } from '@/lib/types';

export default function ConsolidatedInboxPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchantFilter, setSelectedMerchantFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New ticket dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTicketMerchantId, setNewTicketMerchantId] = useState<string>('merchant_music');
  const [newTicketOrderId, setNewTicketOrderId] = useState<string>('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      // Session
      const sessionRes = await fetch('/api/session');
      if (sessionRes.ok) {
        const sData = await sessionRes.json();
        setCustomer(sData.customer);
      }

      // Merchants
      const merchRes = await fetch('/api/merchants');
      if (merchRes.ok) {
        const mData = await merchRes.json();
        setMerchants(mData.merchants || []);
      }

      // Conversations
      const convRes = await fetch('/api/conversations');
      if (convRes.ok) {
        const cData = await convRes.json();
        setConversations(cData.conversations || []);
      }

      // Orders for selector
      const ordRes = await fetch('/api/orders');
      if (ordRes.ok) {
        const oData = await ordRes.json();
        setCustomerOrders(oData.orders || []);
      }
    } catch (e) {
      console.error('Error loading inbox data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (selectedMerchantFilter !== 'all' && c.merchantId !== selectedMerchantFilter) {
      return false;
    }
    if (selectedStatusFilter !== 'all' && c.status !== selectedStatusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = c.subject.toLowerCase().includes(q);
      const matchOrder = c.orderId?.toLowerCase().includes(q);
      const matchSnippet = c.lastMessageSnippet?.toLowerCase().includes(q);
      if (!matchSubject && !matchOrder && !matchSnippet) return false;
    }
    return true;
  });

  const getMerchant = (merchantId: string) => {
    return merchants.find((m) => m.id === merchantId);
  };

  const activeCount = conversations.filter((c) => c.status === 'active').length;
  const escalatedCount = conversations.filter((c) => c.status === 'escalated').length;
  const resolvedCount = conversations.filter((c) => c.status === 'resolved').length;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: newTicketMerchantId,
          orderId: newTicketOrderId || undefined,
          subject: newTicketSubject,
          initialMessage: newTicketMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTicketError(data.error || 'Failed to create conversation');
        setIsSubmitting(false);
        return;
      }

      setIsDialogOpen(false);
      setNewTicketSubject('');
      setNewTicketMessage('');
      setNewTicketOrderId('');
      router.push(`/chat/${data.conversation.id}`);
    } catch (err: any) {
      setTicketError(err.message || 'Network error creating ticket');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Consolidated Support Inbox
            </h1>
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-xs px-2"
            >
              Multi-Merchant
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Manage all your active customer support conversations across multiple storefronts in one
            central place. Responses are powered by Gemini with verified order grounding.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="gap-2 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          <span>New Support Inquiry</span>
        </Button>

        {/* Start New Ticket Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                <span>Open Support Ticket</span>
              </DialogTitle>
              <DialogDescription>
                Select the merchant storefront and optionally pick an order to ground the Gemini AI agent with live order data.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
              {ticketError && (
                <div className="p-3 text-xs bg-destructive/10 border border-destructive/30 text-destructive rounded-lg flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{ticketError}</span>
                </div>
              )}

              {/* Merchant Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Target Merchant
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {merchants.map((m) => {
                    const isSelected = newTicketMerchantId === m.id;
                    const isMusic = m.id === 'merchant_music';
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => {
                          setNewTicketMerchantId(m.id);
                          setNewTicketOrderId('');
                        }}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? isMusic
                              ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                              : 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                            : 'border-border hover:bg-muted/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {isMusic ? (
                            <Disc className="h-4 w-4 text-indigo-500" />
                          ) : (
                            <ShoppingBag className="h-4 w-4 text-emerald-500" />
                          )}
                          <span className="font-semibold text-xs text-foreground">
                            {m.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          {m.tagline}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Picker (scoped to merchant) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Associated Order (Optional Grounding)
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Only orders from this merchant appear
                  </span>
                </div>
                <select
                  value={newTicketOrderId}
                  onChange={(e) => setNewTicketOrderId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">-- No specific order (General inquiry) --</option>
                  {customerOrders
                    .filter((o) => o.merchantId === newTicketMerchantId)
                    .map((o) => (
                      <option key={o.orderId} value={o.orderId}>
                        {o.orderId} - {o.items.map((i) => i.title).join(', ')} (${o.totalAmount.toFixed(2)})
                      </option>
                    ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Subject / Question Topic
                </label>
                <Input
                  placeholder="e.g., Download link inquiry, delivery ETA, or damaged item"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  required
                  className="text-xs h-9"
                />
              </div>

              {/* Initial Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Your Message
                </label>
                <textarea
                  placeholder="Describe your inquiry. The merchant Gemini agent will verify your order data and formulate an immediate response."
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  rows={3}
                  required
                  className="w-full rounded-lg border border-border bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing Grounding...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Start Resolution Chat</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total Threads
              </p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{conversations.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Inbox className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Active Discussions
              </p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{activeCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Human Escalations
              </p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{escalatedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border/80 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Resolved Issues
              </p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{resolvedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between p-2 rounded-2xl bg-card/60 border border-border/80">
        {/* Merchant Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <Button
            variant={selectedMerchantFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedMerchantFilter('all')}
            className="text-xs h-8 rounded-lg"
          >
            All Merchants ({conversations.length})
          </Button>

          {merchants.map((m) => {
            const isSelected = selectedMerchantFilter === m.id;
            const count = conversations.filter((c) => c.merchantId === m.id).length;
            const isMusic = m.id === 'merchant_music';

            return (
              <Button
                key={m.id}
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMerchantFilter(m.id)}
                className={`text-xs h-8 rounded-lg gap-1.5 ${
                  isSelected
                    ? isMusic
                      ? 'bg-indigo-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : ''
                }`}
              >
                {isMusic ? (
                  <Disc className="h-3.5 w-3.5 text-indigo-400" />
                ) : (
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>{m.name}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </Button>
            );
          })}
        </div>

        {/* Status and Search */}
        <div className="flex items-center gap-2">
          {/* Status selector */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="escalated">Escalated to Human</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order or issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs h-8 pl-8"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span>Loading support conversations across merchants...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/30 flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-base text-foreground">No conversations found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchQuery || selectedMerchantFilter !== 'all' || selectedStatusFilter !== 'all'
                ? 'Try clearing your filters or search terms.'
                : 'You have no active support requests. Open an inquiry above or explore a storefront.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedMerchantFilter('all');
                setSelectedStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-xs mt-2"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const merchant = getMerchant(conv.merchantId);
            const isMusic = conv.merchantId === 'merchant_music';

            return (
              <NextLink
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="block group"
              >
                <Card className="hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-card border-border/80">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Merchant Avatar Icon */}
                      <div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                          isMusic
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isMusic ? (
                          <Disc className="h-5 w-5" />
                        ) : (
                          <ShoppingBag className="h-5 w-5" />
                        )}
                      </div>

                      {/* Content details */}
                      <div className="flex flex-col flex-1 min-w-0">
                        {/* Header metadata row */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                              isMusic
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            }`}
                          >
                            {merchant?.name || 'Merchant'}
                          </span>

                          {conv.orderId && (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-mono font-medium bg-muted/50 border-border"
                            >
                              Order #{conv.orderId}
                            </Badge>
                          )}

                          {/* Status Badge */}
                          {conv.status === 'active' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                              Active AI Thread
                            </Badge>
                          )}

                          {conv.status === 'escalated' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                              Escalated to Specialist
                            </Badge>
                          )}

                          {conv.status === 'resolved' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1 text-purple-500" />
                              Resolved
                            </Badge>
                          )}
                        </div>

                        {/* Subject */}
                        <h4 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {conv.subject}
                        </h4>

                        {/* Snippet */}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
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

                    {/* Right side: Timestamp & Arrow */}
                    <div className="flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-auto shrink-0 gap-2 text-muted-foreground pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
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
  );
}
