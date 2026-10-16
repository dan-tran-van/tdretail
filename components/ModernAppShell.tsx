'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Plus,
  Mail,
  Store,
  Disc,
  ShoppingBag,
  Home,
  RefreshCw,
  Sparkles,
  ChevronRight,
  User,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Conversation, Customer, Merchant, Order } from '@/lib/types';
import { getCookie, setCookie } from 'cookies-next';

function getMerchantIcon(merchantId?: string, category?: string) {
  if (merchantId === 'merchant_music' || category === 'digital_music') {
    return Disc;
  }
  return ShoppingBag;
}

export function ModernAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Derive active conversation ID from URL path
  const activeConversationId = pathname?.startsWith('/chat/')
    ? pathname.split('/chat/')[1]?.split('/')[0]
    : undefined;

  // Sidebar expanded state: initialize from cookie
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const cookieVal = getCookie('sidebar_state');
      if (cookieVal !== undefined && cookieVal !== null) {
        return String(cookieVal) === 'true';
      }
      const legacyVal = getCookie('tdretail_sidebar_open');
      if (legacyVal !== undefined && legacyVal !== null) {
        return String(legacyVal) === 'true';
      }
    } catch (e) {
      // fallback
    }
    return true;
  });

  // Sync sidebar state from cookie after client-side hydration.
  // The useState initializer runs during SSR where window is undefined,
  // so the cookie is never read there. This effect corrects the mismatch
  // after mount to avoid the flash caused by remounting on every navigation.
  useEffect(() => {
    try {
      const cookieVal = getCookie('sidebar_state');
      if (cookieVal !== undefined && cookieVal !== null) {
        setSidebarOpen(String(cookieVal) === 'true');
      }
    } catch (e) {
      // ignore
    }
  }, []);


  const handleOpenChange = (open: boolean) => {
    setSidebarOpen(open);
    try {
      setCookie('sidebar_state', String(open), { maxAge: 60 * 60 * 24 * 365, path: '/' });
      setCookie('tdretail_sidebar_open', String(open), { maxAge: 60 * 60 * 24 * 365, path: '/' });
    } catch (e) {
      // ignore
    }
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Ticket Dialog state
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);
  const [isSwitchingPersona, setIsSwitchingPersona] = useState(false);
  const [newMerchantId, setNewMerchantId] = useState('merchant_music');
  const [newOrderId, setNewOrderId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // 1. Session
      const sessRes = await fetch('/api/session');
      if (sessRes.ok) {
        const sData = await sessRes.json();
        setCustomer(sData.customer);
        setAvailableCustomers(sData.availableCustomers || []);
      }

      // 2. Conversations
      const convRes = await fetch('/api/conversations');
      if (convRes.ok) {
        const cData = await convRes.json();
        setConversations(cData.conversations || []);
      }

      // 3. Merchants
      const merchRes = await fetch('/api/merchants');
      if (merchRes.ok) {
        const mData = await merchRes.json();
        setMerchants(mData.merchants || []);
      }

      // 4. Orders for dialog
      const ordRes = await fetch('/api/orders');
      if (ordRes.ok) {
        const oData = await ordRes.json();
        setAvailableOrders(oData.orders || []);
      }
    } catch (e) {
      console.error('App shell fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [pathname, activeConversationId]);


  // Group conversations by merchant
  const groupedConversations = useMemo(() => {
    const merchantMap = new Map<string, { merchant: Merchant | { id: string; name: string }; convs: Conversation[] }>();

    // Initialize with known merchants
    merchants.forEach((m) => {
      merchantMap.set(m.id, { merchant: m, convs: [] });
    });

    // Populate conversations
    conversations.forEach((conv) => {
      const mId = conv.merchantId || 'other';
      if (!merchantMap.has(mId)) {
        merchantMap.set(mId, {
          merchant: { id: mId, name: conv.merchantName || 'Other Store' },
          convs: [],
        });
      }
      merchantMap.get(mId)!.convs.push(conv);
    });

    // Sort merchants: those with active conversations first, then alphabetical
    return Array.from(merchantMap.values()).filter(
      (group) => group.convs.length > 0 || merchants.some((m) => m.id === group.merchant.id)
    );
  }, [conversations, merchants]);

  const switchCustomer = async (customerId: string) => {
    try {
      setIsSwitchingPersona(true);
      document.cookie = `td_customer_id=${customerId}; path=/; max-age=604800`;

      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.customer) {
          setCustomer(data.customer);
        }
        setIsPersonaDialogOpen(false);
        window.location.href = '/inbox';
      }
    } catch (e) {
      console.error('Error switching persona:', e);
    } finally {
      setIsSwitchingPersona(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);
    setIsCreatingTicket(true);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: newMerchantId,
          orderId: newOrderId || undefined,
          subject: newSubject,
          initialMessage: newMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTicketError(data.error || 'Failed to start inquiry');
        setIsCreatingTicket(false);
        return;
      }

      setIsNewTicketOpen(false);
      setNewSubject('');
      setNewMessage('');
      setNewOrderId('');
      await fetchData();
      router.push(`/chat/${data.conversation.id}`);
    } catch (err: any) {
      setTicketError(err.message || 'Network error');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={handleOpenChange}
      className="h-screen w-screen overflow-hidden"
    >
      <Sidebar collapsible="icon" className="border-r border-border">
        {/* Sidebar Header: New Inquiry + Nav Links */}
        <SidebarHeader className="border-b border-border/80 gap-0 pb-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="New Inquiry"
                onClick={() => setIsNewTicketOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>New Inquiry</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === '/'}
                tooltip="Home & Demos"
                render={
                  <NextLink href="/">
                    <Home className="h-4 w-4" />
                    <span>Home & Demos</span>
                  </NextLink>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === '/inbox'}
                tooltip="All Conversations"
                render={
                  <NextLink href="/inbox">
                    <MessageSquare className="h-4 w-4" />
                    <span>All Conversations</span>
                  </NextLink>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Sidebar Content: Chats Grouped By Merchant */}
        <SidebarContent className="py-2">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
              <span className="group-data-[collapsible=icon]:hidden">Loading chats...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              <p>No conversations yet.</p>
              <p className="mt-1 text-[11px]">Click "New Inquiry" to ask Gemini.</p>
            </div>
          ) : (
            groupedConversations.map((group) => {
              const MerchantIcon = getMerchantIcon(group.merchant.id, (group.merchant as Merchant).category);
              const hasActiveChat = group.convs.some((c) => c.id === activeConversationId);

              return (
                <Collapsible
                  key={group.merchant.id}
                  defaultOpen={true}
                  className="group/collapsible"
                >
                  <SidebarGroup className="p-1">
                    <SidebarGroupLabel
                      render={
                        <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-1 px-2 rounded-md hover:bg-sidebar-accent/50 transition-colors">
                          <span className="flex items-center gap-2 truncate">
                            <MerchantIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate group-data-[collapsible=icon]:hidden">
                              {group.merchant.name}
                            </span>
                          </span>
                          <span className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                            <span className="text-[10px] font-normal text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded-full">
                              {group.convs.length}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-open/collapsible:rotate-180" />
                          </span>
                        </CollapsibleTrigger>
                      }
                    />

                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {group.convs.length === 0 ? (
                            <div className="px-3 py-1.5 text-[11px] text-muted-foreground italic group-data-[collapsible=icon]:hidden">
                              No chats
                            </div>
                          ) : (
                            group.convs.map((conv) => {
                              const isActive = activeConversationId === conv.id;
                              const ItemIcon = getMerchantIcon(conv.merchantId);

                              return (
                                <SidebarMenuItem key={conv.id}>
                                  <SidebarMenuButton
                                    isActive={isActive}
                                    tooltip={conv.subject}
                                    className="h-8 text-xs font-normal"
                                    render={
                                      <NextLink
                                        href={`/chat/${conv.id}`}
                                        className="flex items-center gap-2 w-full min-w-0"
                                      >
                                        <ItemIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-data-active/menu-button:text-primary" />
                                        <span className="truncate text-xs">{conv.subject}</span>
                                      </NextLink>
                                    }
                                  />
                                </SidebarMenuItem>
                              );
                            })
                          )}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              );
            })
          )}
        </SidebarContent>

        {/* Sidebar Footer: Active Shopper Persona */}
        <SidebarFooter className="p-2 border-t border-border/80">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip={customer ? `${customer.name} (${customer.email})` : 'Shopper Persona'}
                onClick={() => setIsPersonaDialogOpen(true)}
                className="w-full h-11 p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
              >
                <Avatar className="h-7 w-7 border border-border shrink-0">
                  <AvatarImage src={customer?.avatarUrl} />
                  <AvatarFallback className="text-xs bg-muted text-foreground font-semibold">
                    {customer?.name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {customer?.name || 'Customer'}
                    </span>
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-normal text-muted-foreground">
                      Switch
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {customer?.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Main App Content View Area */}
      <SidebarInset className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* Compact sticky top-bar with sidebar toggle (only visible when sidebar is collapsed) */}
        <div className="flex items-center h-10 px-3 border-b border-border/60 shrink-0 md:hidden peer-data-[state=expanded]:hidden" data-sidebar-inset-header>
          <SidebarTrigger className="h-7 w-7 text-muted-foreground" />
        </div>
        {children}
      </SidebarInset>

      {/* New Support Inquiry Modal Dialog */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Start New Support Conversation</span>
            </DialogTitle>
            <DialogDescription>
              Submit an inquiry to any participating merchant. Gemini AI verifies your order details
              and context server-side.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
            {ticketError && (
              <div className="p-3 text-xs bg-destructive/10 border border-destructive/30 text-destructive rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{ticketError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Storefront</label>
              <select
                value={newMerchantId}
                onChange={(e) => {
                  setNewMerchantId(e.target.value);
                  setNewOrderId('');
                }}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
              >
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category === 'digital_music' ? 'Digital Music' : 'Groceries'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Link Order (Optional)</span>
                <span className="text-muted-foreground text-[10px]">
                  Provides live server grounding to Gemini
                </span>
              </label>
              <select
                value={newOrderId}
                onChange={(e) => setNewOrderId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
              >
                <option value="">No linked order (General inquiry)</option>
                {availableOrders
                  .filter((o) => o.merchantId === newMerchantId)
                  .map((o) => (
                    <option key={o.orderId} value={o.orderId}>
                      Order #{o.orderId} - {o.orderStatusDisplay} (${o.totalAmount.toFixed(2)})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Topic / Subject</label>
              <input
                type="text"
                required
                placeholder="e.g., Where is my delivery? or License key question"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Initial Question</label>
              <textarea
                required
                rows={3}
                placeholder="Describe your issue or ask a question..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewTicketOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingTicket} className="gap-2">
                {isCreatingTicket ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>Start Conversation</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Switch Demo Persona Dialog */}
      <Dialog open={isPersonaDialogOpen} onOpenChange={setIsPersonaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch Demo Shopper Persona</DialogTitle>
            <DialogDescription>
              Select a persona to test orders, AI customer support conversations, and email simulations under different identities.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2.5 py-2">
            {availableCustomers.map((cust) => {
              const isSelected = cust.id === customer?.id;
              return (
                <button
                  key={cust.id}
                  type="button"
                  disabled={isSwitchingPersona}
                  onClick={() => switchCustomer(cust.id)}
                  className={`w-full flex items-center gap-3.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border hover:bg-muted/80 bg-card'
                  }`}
                >
                  <Avatar className="h-10 w-10 border border-border shrink-0">
                    <AvatarImage src={cust.avatarUrl} />
                    <AvatarFallback className="font-bold text-xs">{cust.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{cust.name}</span>
                      {isSelected && (
                        <Badge variant="default" className="text-[10px] h-4 px-1.5 font-bold">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{cust.email}</p>
                    <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{cust.defaultAddress}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await fetch('/api/seed', { method: 'POST' });
                await fetchData();
                window.location.reload();
              }}
              className="gap-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset All Mock Data</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPersonaDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
