'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Mail,
  Send,
  Inbox,
  Star,
  Clock,
  FileText,
  Trash2,
  AlertCircle,
  Archive,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  ExternalLink,
  ShieldCheck,
  Disc,
  ShoppingBag,
  MoreVertical,
  ArrowLeft,
  CheckCircle2,
  Tag,
  Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { OutboxEmail, Customer } from '@/lib/types';

export default function GmailStyleOutboxPage() {
  const [emails, setEmails] = useState<OutboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<OutboxEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<'sent' | 'all' | 'starred' | 'drafts'>('sent');
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);
  const [isSwitchingPersona, setIsSwitchingPersona] = useState(false);

  // Reply simulation modal state
  const [isSimulating, setIsSimulating] = useState(false);
  const [replyText, setReplyText] = useState('Thank you, this confirmed my inquiry.');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [simStatus, setSimStatus] = useState<string | null>(null);

  const loadSession = async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setAvailableCustomers(data.availableCustomers || []);
      }
    } catch (e) {
      console.error('Error fetching session in outbox:', e);
    }
  };

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
        window.location.reload();
      }
    } catch (e) {
      console.error('Error switching persona:', e);
    } finally {
      setIsSwitchingPersona(false);
    }
  };

  const loadEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/outbox');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch (e) {
      console.error('Error fetching outbox:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
    loadSession();
  }, []);

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSimulateReply = (email: OutboxEmail) => {
    setSelectedEmail(email);
    setIsSimulating(true);
    setSimStatus(null);
  };

  const submitSimulatedReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setSubmittingReply(true);
    setSimStatus(null);

    try {
      const res = await fetch('/api/webhooks/sendgrid/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: selectedEmail.to,
          toEmail: selectedEmail.replyTo,
          subject: `Re: ${selectedEmail.subject}`,
          bodyText: replyText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSimStatus('Reply delivered to SendGrid inbound webhook & routed to conversation thread.');
        setTimeout(() => {
          setIsSimulating(false);
        }, 1500);
      } else {
        setSimStatus(data.error || 'Failed to simulate email reply');
      }
    } catch (err: any) {
      setSimStatus(err.message || 'Network error');
    } finally {
      setSubmittingReply(false);
    }
  };

  const filteredEmails = emails.filter((email) => {
    if (activeFolder === 'starred' && !starredIds[email.id]) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = email.subject.toLowerCase().includes(q);
      const matchTo = email.to.toLowerCase().includes(q);
      const matchFrom = email.from.toLowerCase().includes(q);
      const matchMerchant = email.merchantName.toLowerCase().includes(q);
      const matchBody = email.bodyText.toLowerCase().includes(q);
      return matchSubject || matchTo || matchFrom || matchMerchant || matchBody;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-screen w-screen bg-background overflow-hidden">
      {/* Gmail Top App Bar */}
      <header className="h-16 border-b border-border/80 px-4 flex items-center justify-between gap-4 bg-card/60 backdrop-blur shrink-0">
        {/* Brand / Title */}
        <div className="flex items-center gap-3 w-64 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-foreground">
                TD Mail Outbox
              </span>
              <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">
                SendGrid
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Simulated Webmail Client</p>
          </div>
        </div>

        {/* Gmail Search Bar */}
        <div className="flex-1 max-w-2xl relative">
          <Search className="h-4 w-4 absolute left-3.5 top-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search mail by recipient, merchant, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-muted/60 border-border/80 focus-visible:bg-background text-xs"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadEmails}
            disabled={loading}
            className="h-8 gap-1.5 text-xs rounded-lg"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <NextLink href="/inbox">
            <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs rounded-lg">
              <Inbox className="h-3.5 w-3.5" />
              <span>Back to Chat Inbox</span>
            </Button>
          </NextLink>

          {/* Persona Switcher in Outbox */}
          <button
            type="button"
            onClick={() => setIsPersonaDialogOpen(true)}
            className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full hover:bg-muted/80 border border-border transition-colors text-left outline-none cursor-pointer"
            title="Click to Switch Demo Persona"
          >
            <Avatar className="h-6 w-6 border border-border">
              <AvatarImage src={customer?.avatarUrl} />
              <AvatarFallback className="text-[10px] bg-muted font-bold">
                {customer?.name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-foreground hidden md:inline max-w-[100px] truncate">
              {customer?.name || 'Customer'}
            </span>
            <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-normal text-muted-foreground">
              Switch
            </Badge>
          </button>
        </div>
      </header>

      {/* Gmail Body Layout: Left Sidebar + Mail List / Detail View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Mail Folders Sidebar */}
        <aside className="w-56 border-r border-border/80 bg-card/30 p-3 flex flex-col gap-1 shrink-0">
          <div className="pb-2 mb-1 border-b border-border/60">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Mailbox
            </div>
          </div>

          <Button
            variant={activeFolder === 'sent' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveFolder('sent');
              setSelectedEmail(null);
            }}
            className="w-full justify-start gap-3 h-9 text-xs rounded-full px-3 font-medium"
          >
            <Send className="h-4 w-4 text-primary" />
            <span className="flex-1 text-left">Sent Messages</span>
            <span className="text-[11px] text-muted-foreground">{emails.length}</span>
          </Button>

          <Button
            variant={activeFolder === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveFolder('all');
              setSelectedEmail(null);
            }}
            className="w-full justify-start gap-3 h-9 text-xs rounded-full px-3"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-left">All Mail</span>
            <span className="text-[11px] text-muted-foreground">{emails.length}</span>
          </Button>

          <Button
            variant={activeFolder === 'starred' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveFolder('starred');
              setSelectedEmail(null);
            }}
            className="w-full justify-start gap-3 h-9 text-xs rounded-full px-3"
          >
            <Star className="h-4 w-4 text-amber-500 fill-amber-500/20" />
            <span className="flex-1 text-left">Starred</span>
            <span className="text-[11px] text-muted-foreground">
              {Object.values(starredIds).filter(Boolean).length}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled
            className="w-full justify-start gap-3 h-9 text-xs rounded-full px-3 text-muted-foreground/50 opacity-60"
          >
            <FileText className="h-4 w-4" />
            <span className="flex-1 text-left">Drafts</span>
            <span className="text-[11px]">0</span>
          </Button>

          <div className="mt-auto pt-4 border-t border-border/60">
            <div className="p-2.5 rounded-xl border border-border bg-muted/40 text-[11px] space-y-1 text-muted-foreground">
              <span className="font-semibold text-foreground block flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Inbound Webhook
              </span>
              <p className="leading-relaxed">
                Click <strong>"Simulate Reply"</strong> on any email to test customer response routing via SendGrid.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {selectedEmail ? (
            /* Gmail Detailed Email View */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Detail Toolbar */}
              <div className="h-12 border-b border-border/80 px-4 flex items-center justify-between gap-2 shrink-0 bg-card/20">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEmail(null)}
                    title="Back to sent list"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEmail(null)}
                    title="Archive"
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSimulateReply(selectedEmail)}
                    title="Reply"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                  >
                    <CornerUpLeft className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSimulateReply(selectedEmail)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5" />
                    <span>Simulate Reply</span>
                  </Button>

                  <NextLink href={`/chat/${selectedEmail.conversationId}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                      <span>View Live Chat</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </NextLink>
                </div>
              </div>

              {/* Email Content Body */}
              <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
                {/* Subject & Status */}
                <div className="space-y-2 border-b border-border pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                      {selectedEmail.subject}
                    </h1>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      SendGrid Delivered
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span>Merchant: <strong>{selectedEmail.merchantName}</strong></span>
                    <span>•</span>
                    <span>Thread #{selectedEmail.conversationId}</span>
                  </div>
                </div>

                {/* Sender / Recipient Metadata Card */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {selectedEmail.merchantName.charAt(0)}
                    </div>
                    <div className="space-y-0.5 min-w-0 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {selectedEmail.merchantName} Support
                        </span>
                        <span className="text-muted-foreground font-mono text-[11px]">
                          &lt;{selectedEmail.from}&gt;
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        to <span className="text-foreground">{selectedEmail.to}</span>
                      </div>
                      <div className="text-primary font-mono text-[11px] pt-0.5">
                        Reply-To: <strong>{selectedEmail.replyTo}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-muted-foreground shrink-0">
                    <div>{new Date(selectedEmail.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div>{new Date(selectedEmail.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {/* Message Body */}
                <div className="rounded-2xl border border-border bg-card p-6 min-h-[220px] shadow-xs">
                  {selectedEmail.bodyHtml ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                      className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-foreground leading-relaxed">
                      {selectedEmail.bodyText}
                    </div>
                  )}
                </div>

                {/* Reply Routing Explanation Box */}
                <div className="p-4 rounded-xl border border-border bg-muted/40 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>How Customer Email Reply Ingestion Works</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This notification set the header <code className="bg-background px-1 py-0.5 rounded border border-border font-mono text-foreground">{selectedEmail.replyTo}</code>.
                    When the customer responds via their standard email app, SendGrid's Inbound Parse webhook decodes the conversation identifier, appends the response to the customer's chat, and triggers the Gemini agent to formulate the resolution.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Gmail Table-Style Email List */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* List Header / Filter bar */}
              <div className="h-10 border-b border-border/80 px-4 flex items-center justify-between text-xs text-muted-foreground bg-card/20 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                    {activeFolder === 'sent' ? 'Sent Notifications' : activeFolder === 'starred' ? 'Starred Messages' : 'All Messages'} ({filteredEmails.length})
                  </span>
                </div>
                <span>Showing latest first</span>
              </div>

              {/* Scrollable Email Row Items */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {loading ? (
                  <div className="p-16 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading outbox emails...
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="p-16 text-center text-muted-foreground space-y-2">
                    <Mail className="h-10 w-10 mx-auto opacity-30" />
                    <p className="text-sm font-semibold text-foreground">No outgoing emails found</p>
                    <p className="text-xs">Inquiries created in the customer inbox generate notification records here.</p>
                  </div>
                ) : (
                  filteredEmails.map((email) => {
                    const isStarred = !!starredIds[email.id];
                    const isMusic = email.merchantId === 'merchant_music';

                    return (
                      <div
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors text-xs"
                      >
                        {/* Star Toggle */}
                        <button
                          onClick={(e) => toggleStar(e, email.id)}
                          className="text-muted-foreground hover:text-amber-500 shrink-0 transition-colors"
                          title="Star message"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              isStarred ? 'text-amber-500 fill-amber-500' : 'opacity-40 hover:opacity-100'
                            }`}
                          />
                        </button>

                        {/* Recipient / Merchant */}
                        <div className="w-48 sm:w-56 shrink-0 flex items-center gap-2 truncate">
                          {isMusic ? (
                            <Disc className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <span className="font-semibold text-foreground truncate">
                            {email.merchantName}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate hidden md:inline">
                            to {email.to}
                          </span>
                        </div>

                        {/* Subject & Snippet */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">
                            {email.subject}
                          </span>
                          <span className="text-muted-foreground text-[11px] truncate hidden sm:inline">
                            - {email.bodyText}
                          </span>
                        </div>

                        {/* Date / Time */}
                        <div className="w-24 text-right text-[11px] text-muted-foreground shrink-0 group-hover:text-foreground font-mono">
                          {new Date(email.sentAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reply Simulation Modal */}
      <Dialog open={isSimulating} onOpenChange={setIsSimulating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CornerUpLeft className="h-5 w-5 text-primary" />
              <span>Simulate Customer Email Reply</span>
            </DialogTitle>
            <DialogDescription>
              Test SendGrid Inbound Parse reply ingestion into the conversation thread.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {simStatus && (
              <div className="p-2.5 rounded-lg text-xs bg-muted text-foreground border border-border">
                {simStatus}
              </div>
            )}

            <div className="space-y-1 font-mono text-xs bg-muted/50 p-2.5 rounded-lg border border-border">
              <div>
                <span className="text-muted-foreground">To (Webhook Reply-To):</span>{' '}
                <span className="text-foreground">{selectedEmail?.replyTo}</span>
              </div>
              <div>
                <span className="text-muted-foreground">From (Shopper Email):</span>{' '}
                <span className="text-foreground">{selectedEmail?.to}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Customer Email Reply Text</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setIsSimulating(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submittingReply || !replyText.trim()}
                onClick={submitSimulatedReply}
                className="gap-1.5"
              >
                {submittingReply ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Send Inbound Reply Webhook</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Switch Demo Persona Dialog in Outbox */}
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

          <div className="pt-3 border-t border-border flex items-center justify-end">
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
    </div>
  );
}
