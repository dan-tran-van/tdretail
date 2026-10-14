'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Mail,
  Store,
  Disc,
  ShoppingBag,
  Home,
  RefreshCw,
  Sparkles,
  ChevronRight,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Conversation, Customer, Merchant, Order } from '@/lib/types';

import { getCookie, setCookie } from 'cookies-next';

interface ModernAppShellProps {
  children: React.ReactNode;
  activeConversationId?: string;
  onRefresh?: () => void;
}

export function ModernAppShell({
  children,
  activeConversationId,
  onRefresh,
}: ModernAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Sidebar expanded state: initialize directly from cookie / localStorage to prevent layout jumping/flickering on navigation
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const cookieVal = getCookie('tdretail_sidebar_open');
      if (cookieVal !== undefined && cookieVal !== null) {
        return String(cookieVal) === 'true';
      }
      const saved = localStorage.getItem('tdretail_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {
      // fallback
    }
    return true;
  });

  const toggleSidebar = (open: boolean) => {
    setIsSidebarOpen(open);
    try {
      localStorage.setItem('tdretail_sidebar_open', String(open));
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

  const switchCustomer = async (customerId: string) => {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      if (res.ok) {
        await fetchData();
        router.refresh();
      }
    } catch (e) {
      console.error('Error switching persona:', e);
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
    <div className="flex-1 flex overflow-hidden relative h-screen w-screen">
      {/* Modern Collapsible Sidebar */}
      <aside
        className={`h-full border-r border-border bg-card/60 backdrop-blur transition-all duration-300 ease-in-out flex flex-col z-20 shrink-0 ${
          isSidebarOpen ? 'w-72 sm:w-80' : 'w-16'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
          {isSidebarOpen ? (
            <>
              <Button
                onClick={() => setIsNewTicketOpen(true)}
                className="flex-1 h-9 gap-2 text-xs font-semibold shadow-xs justify-start px-3"
              >
                <Plus className="h-4 w-4" />
                <span>New Inquiry</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSidebar(false)}
                title="Collapse sidebar"
                className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleSidebar(true)}
                title="Expand sidebar"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={() => setIsNewTicketOpen(true)}
                title="New inquiry"
                className="h-9 w-9"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Quick Links */}
        <div className="p-2 border-b border-border/60 flex flex-col gap-1 shrink-0">
          <NextLink href="/">
            <Button
              variant={pathname === '/' ? 'secondary' : 'ghost'}
              size="sm"
              className={`w-full text-xs h-8 ${
                isSidebarOpen ? 'justify-start gap-2.5 px-3' : 'justify-center px-0'
              }`}
              title="Home Platform Landing"
            >
              <Home className="h-4 w-4 text-muted-foreground" />
              {isSidebarOpen && <span>Home & Demos</span>}
            </Button>
          </NextLink>

          <NextLink href="/inbox">
            <Button
              variant={pathname === '/inbox' ? 'secondary' : 'ghost'}
              size="sm"
              className={`w-full text-xs h-8 ${
                isSidebarOpen ? 'justify-start gap-2.5 px-3' : 'justify-center px-0'
              }`}
              title="Inbox Dashboard"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              {isSidebarOpen && <span>All Conversations</span>}
            </Button>
          </NextLink>

          <NextLink href="/outbox">
            <Button
              variant={pathname === '/outbox' ? 'secondary' : 'ghost'}
              size="sm"
              className={`w-full text-xs h-8 ${
                isSidebarOpen ? 'justify-start gap-2.5 px-3' : 'justify-center px-0'
              }`}
              title="Outbox Inspector"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              {isSidebarOpen && <span>Email Outbox</span>}
            </Button>
          </NextLink>
        </div>

        {/* Conversation List (Chat History) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isSidebarOpen && (
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Recent Chats</span>
              <span>{conversations.length}</span>
            </div>
          )}

          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
              {isSidebarOpen && <span>Loading chats...</span>}
            </div>
          ) : conversations.length === 0 ? (
            isSidebarOpen && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <p>No conversations yet.</p>
                <p className="mt-1 text-[11px]">Click "New Inquiry" to ask Gemini.</p>
              </div>
            )
          ) : (
            conversations.map((conv) => {
              const isActive = activeConversationId === conv.id;
              const isMusic = conv.merchantId === 'merchant_music';

              if (!isSidebarOpen) {
                return (
                  <NextLink key={conv.id} href={`/chat/${conv.id}`}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="icon"
                      className="w-full h-10 my-0.5 relative"
                      title={`${conv.subject} (${conv.merchantName})`}
                    >
                      {isMusic ? (
                        <Disc className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      )}
                      {conv.status === 'escalated' && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </Button>
                  </NextLink>
                );
              }

              return (
                <NextLink key={conv.id} href={`/chat/${conv.id}`}>
                  <div
                    className={`group flex items-start gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer text-left border ${
                      isActive
                        ? 'bg-secondary text-secondary-foreground border-border shadow-xs'
                        : 'hover:bg-muted/60 border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isMusic ? (
                        <Disc className="h-4 w-4 text-primary" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {conv.subject}
                        </span>
                        {conv.status === 'escalated' ? (
                          <Badge variant="destructive" className="text-[9px] h-3.5 px-1 uppercase">
                            Escalated
                          </Badge>
                        ) : conv.status === 'resolved' ? (
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1 uppercase">
                            Resolved
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {conv.lastMessageSnippet || conv.merchantName || 'Support conversation'}
                      </p>
                    </div>
                  </div>
                </NextLink>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Active Shopper Persona */}
        <div className="p-3 border-t border-border/80 bg-background/50 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted transition-colors text-left outline-none ${
                !isSidebarOpen ? 'justify-center' : ''
              }`}
              title="Switch Demo Persona"
            >
              <Avatar className="h-7 w-7 border border-border shrink-0">
                <AvatarImage src={customer?.avatarUrl} />
                <AvatarFallback className="text-xs bg-muted text-foreground font-semibold">
                  {customer?.name?.charAt(0) || 'C'}
                </AvatarFallback>
              </Avatar>

              {isSidebarOpen && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {customer?.name || 'Customer'}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {customer?.email}
                  </span>
                </div>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 p-1.5">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                Demo Shopper Persona
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableCustomers.map((cust) => (
                <DropdownMenuItem
                  key={cust.id}
                  onClick={() => switchCustomer(cust.id)}
                  className="gap-2.5 text-xs py-2 cursor-pointer"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={cust.avatarUrl} />
                    <AvatarFallback className="text-[10px]">{cust.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-foreground truncate">{cust.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{cust.email}</span>
                  </div>
                  {cust.id === customer?.id && (
                    <span className="text-[10px] text-primary font-bold">Active</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await fetch('/api/seed', { method: 'POST' });
                  fetchData();
                  router.refresh();
                }}
                className="gap-2 text-xs py-1.5 cursor-pointer text-muted-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Demo Mock Data</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main App Content View Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {children}
      </main>

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
    </div>
  );
}
