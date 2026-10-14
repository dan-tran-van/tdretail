'use client';

import React, { useState, useEffect, useRef } from 'react';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Disc,
  ShoppingBag,
  Sparkles,
  Send,
  User,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Mail,
  Info,
  Package,
  Key,
  Truck,
  HelpCircle,
  FileText,
  UserCheck,
  CornerDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Conversation, Merchant, Message, Order, Customer } from '@/lib/types';

function ConversationThreadContent() {
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const router = useRouter();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [linkedOrder, setLinkedOrder] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Input & sending
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Order banner expansion toggle
  const [isOrderExpanded, setIsOrderExpanded] = useState(true);

  // Tool Call inspector expanded per message
  const [expandedToolCalls, setExpandedToolCalls] = useState<Record<string, boolean>>({});

  // Human escalation modal
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalationReason, setEscalationReason] = useState('Requires specialized human assistance');
  const [isEscalating, setIsEscalating] = useState(false);

  // Demo Judge Actions
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const [simulatedEmailText, setSimulatedEmailText] = useState('');
  const [isSimulatingEmail, setIsSimulatingEmail] = useState(false);
  const [humanAgentReplyText, setHumanAgentReplyText] = useState('');
  const [isAgentReplying, setIsAgentReplying] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreadData = async (silent = false) => {
    if (!conversationId) return;
    try {
      if (!silent) setLoading(true);

      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        setMerchant(data.merchant);
        setLinkedOrder(data.linkedOrder);
        setMessages(data.messages || []);
      }

      // Customer
      const sessRes = await fetch('/api/session');
      if (sessRes.ok) {
        const sData = await sessRes.json();
        setCustomer(sData.customer);
      }
    } catch (err) {
      console.error('Error fetching conversation thread:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadThreadData();

    // Auto-polling every 4 seconds so email replies and background updates appear live!
    const interval = setInterval(() => {
      loadThreadData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleToolCall = (msgId: string) => {
    setExpandedToolCalls((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadThreadData(true);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleEscalate = async () => {
    setIsEscalating(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: escalationReason }),
      });

      if (res.ok) {
        setShowEscalateDialog(false);
        await loadThreadData(true);
      }
    } catch (err) {
      console.error('Error escalating conversation:', err);
    } finally {
      setIsEscalating(false);
    }
  };

  const handleResolve = async () => {
    try {
      const newStatus = conversation?.status === 'resolved' ? 'active' : 'resolved';
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadThreadData(true);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Demo: simulate customer email reply via SendGrid Inbound Parse
  const handleSimulateEmailReply = async () => {
    if (!simulatedEmailText.trim() || isSimulatingEmail) return;
    setIsSimulatingEmail(true);
    setDemoNotice(null);

    try {
      const res = await fetch('/api/webhooks/sendgrid/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          replyText: simulatedEmailText.trim(),
          customerEmail: conversation?.customerEmail,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSimulatedEmailText('');
        setDemoNotice('Inbound email ingested via SendGrid webhook! AI reply generated.');
        await loadThreadData(true);
      } else {
        setDemoNotice(`Simulation error: ${data.error}`);
      }
    } catch (err: any) {
      setDemoNotice(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulatingEmail(false);
    }
  };

  // Demo: reply as human agent
  const handleHumanAgentReply = async (markResolved = false) => {
    if (!humanAgentReplyText.trim() || isAgentReplying) return;
    setIsAgentReplying(true);
    setDemoNotice(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/agent-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: humanAgentReplyText.trim(),
          agentName: `${merchant?.name || 'TD Retail'} Senior Specialist`,
          markResolved,
        }),
      });

      if (res.ok) {
        setHumanAgentReplyText('');
        setDemoNotice('Human support agent reply posted & sent to customer email.');
        await loadThreadData(true);
      }
    } catch (err) {
      setDemoNotice('Failed to post agent reply');
    } finally {
      setIsAgentReplying(false);
    }
  };

  const isMusic = merchant?.category === 'digital_music';

  if (loading) {
    return (
      <div className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Loading resolution thread...</span>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 max-w-4xl w-full mx-auto p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Conversation Not Found</h2>
        <p className="text-muted-foreground text-sm">
          The requested conversation could not be loaded or belongs to a different session.
        </p>
        <NextLink href="/inbox">
          <Button variant="outline" size="sm">
            Return to Inbox
          </Button>
        </NextLink>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-4.2rem)]">
      {/* Top Bar Navigation & Merchant Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/80 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <NextLink href="/inbox">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </NextLink>

          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs bg-muted text-foreground border border-border">
            {isMusic ? <Disc className="h-5 w-5 text-primary" /> : <ShoppingBag className="h-5 w-5 text-primary" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-foreground leading-tight">
                {merchant?.name}
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-semibold h-4 px-1.5 border-border"
              >
                {merchant?.category === 'digital_music' ? 'Digital Music' : 'Groceries'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{merchant?.supportEmail}</span>
              <span>•</span>
              <span className="font-mono text-[11px]">Thread #{conversation.id}</span>
            </div>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Status Badge */}
          {conversation.status === 'active' && (
            <Badge
              variant="secondary"
              className="text-xs h-7 px-2.5"
            >
              <span className="h-2 w-2 rounded-full bg-primary mr-1.5 animate-pulse" />
              Active AI Thread
            </Badge>
          )}

          {conversation.status === 'escalated' && (
            <Badge
              variant="destructive"
              className="text-xs h-7 px-2.5"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Escalated to Human
            </Badge>
          )}

          {conversation.status === 'resolved' && (
            <Badge
              variant="outline"
              className="text-xs h-7 px-2.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Resolved
            </Badge>
          )}

          {/* Escalate button */}
          {conversation.status !== 'escalated' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEscalateDialog(true)}
              className="text-xs h-7 gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Request Human</span>
            </Button>
          )}

          {/* Resolve / Reopen toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResolve}
            className="text-xs h-7 text-muted-foreground hover:text-foreground"
          >
            {conversation.status === 'resolved' ? 'Re-open Ticket' : 'Mark Resolved'}
          </Button>
        </div>
      </div>

      {/* Linked Order Grounding Summary Bar */}
      {linkedOrder && (
        <div className="my-3 rounded-xl border border-border bg-muted/40 p-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Grounded Order Context: <span className="font-mono">{linkedOrder.orderId}</span>
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-medium bg-background border-border"
              >
                {linkedOrder.orderStatusDisplay}
              </Badge>
            </div>

            <button
              onClick={() => setIsOrderExpanded(!isOrderExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <span>{isOrderExpanded ? 'Hide Details' : 'View Details'}</span>
              {isOrderExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {isOrderExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground/80 block">Items Purchased:</span>
                <span className="truncate block">
                  {linkedOrder.items?.map((i: any) => `${i.title} (${i.quantity}x)`).join(', ')}
                </span>
              </div>

              {linkedOrder.estimatedDelivery && (
                <div>
                  <span className="font-semibold text-foreground/80 block">Estimated Arrival / Tracking:</span>
                  <span className="truncate block">{linkedOrder.estimatedDelivery}</span>
                </div>
              )}

              {linkedOrder.courierNotes && (
                <div>
                  <span className="font-semibold text-foreground/80 block">Fulfillment Notes:</span>
                  <span className="truncate block">{linkedOrder.courierNotes}</span>
                </div>
              )}

              {linkedOrder.items[0]?.licenseKey && (
                <div className="sm:col-span-2">
                  <span className="font-semibold text-foreground/80 flex items-center gap-1">
                    <Key className="h-3 w-3 text-primary" />
                    Verified License Key:
                  </span>
                  <code className="text-[11px] font-mono bg-background px-1.5 py-0.5 rounded border border-border mt-0.5 inline-block">
                    {linkedOrder.items[0].licenseKey}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Message History Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
        {messages.map((msg) => {
          const isCustomer = msg.sender === 'customer';
          const isAi = msg.sender === 'ai';
          const isHumanAgent = msg.sender === 'human_agent';
          const isSystem = msg.sender === 'system';
          const hasToolCalls = msg.metadata?.toolCalls && msg.metadata.toolCalls.length > 0;
          const isExpanded = expandedToolCalls[msg.id];

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <div className="px-3 py-1.5 rounded-full bg-muted/80 border border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span>{msg.content}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] ${
                isCustomer ? 'ml-auto' : 'mr-auto'
              }`}
            >
              {/* Sender Name & Timestamp */}
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {isAi && (
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                )}
                {isHumanAgent && (
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                )}
                <span className="text-[11px] font-semibold text-foreground/80">
                  {isCustomer ? 'You' : msg.senderName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-xs transition-colors ${
                  isCustomer
                    ? 'bg-primary text-primary-foreground rounded-tr-xs'
                    : isHumanAgent
                    ? 'bg-secondary text-secondary-foreground border border-border rounded-tl-xs'
                    : 'bg-card text-card-foreground border border-border rounded-tl-xs'
                }`}
              >
                {msg.content}
              </div>

              {/* AI Tool Grounding Badge & Expandable Inspector */}
              {isAi && (
                <div className="mt-1.5 px-1 space-y-1.5 w-full">
                  <div className="flex items-center gap-2">
                    {msg.metadata?.isAiGrounded && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium gap-1 h-5"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>Grounded with Merchant Order API</span>
                      </Badge>
                    )}

                    {hasToolCalls && (
                      <button
                        onClick={() => toggleToolCall(msg.id)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono hover:underline"
                      >
                        <span>
                          {isExpanded ? 'Hide Server Tool Calls' : `Inspect Server Tool Calls (${msg.metadata?.toolCalls?.length})`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Tool Call Inspection Details */}
                  {hasToolCalls && isExpanded && (
                    <div className="p-2.5 rounded-lg bg-muted border border-border font-mono text-[11px] space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px] pb-1 border-b border-border">
                        <span>Server-Side Tool Execution Sandbox</span>
                        <span>Model: {msg.metadata?.modelName || 'gemini-2.5-flash'}</span>
                      </div>
                      {msg.metadata?.toolCalls?.map((tc, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-1 text-primary font-semibold">
                            <CornerDownRight className="h-3 w-3" />
                            <span>Tool: {tc.name}</span>
                          </div>
                          <div className="bg-background p-2 rounded border border-border text-[10px] overflow-x-auto">
                            <span className="text-muted-foreground font-sans block mb-0.5">
                              Arguments:
                            </span>
                            <pre className="text-foreground">
                              {JSON.stringify(tc.arguments, null, 2)}
                            </pre>
                            <span className="text-muted-foreground font-sans block mt-1.5 mb-0.5">
                              Server Response (Validated against tenant {conversation.merchantId}):
                            </span>
                            <pre className="text-foreground">
                              {JSON.stringify(tc.result, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      {merchant?.demoPromptSuggestions && merchant.demoPromptSuggestions.length > 0 && (
        <div className="py-2 overflow-x-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
            Suggested:
          </span>
          {merchant.demoPromptSuggestions.slice(0, 3).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(prompt)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted border border-border/80 text-foreground/80 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="pt-2 border-t border-border/80 flex items-center gap-2 shrink-0"
      >
        <Textarea
          placeholder={`Message ${merchant?.name} support (Order inquiries are automatically verified with Gemini)...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
          rows={1}
          disabled={isSending || conversation.status === 'resolved'}
          className="resize-none text-xs sm:text-sm min-h-[42px] max-h-[100px] flex-1 py-2.5"
        />

        <Button
          type="submit"
          disabled={!inputText.trim() || isSending || conversation.status === 'resolved'}
          className="h-[42px] px-4 gap-2 bg-primary text-primary-foreground"
        >
          {isSending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <Send className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Bottom Floating Judge & Demo Testing Console Drawer */}
      <div className="mt-2 shrink-0">
        <button
          onClick={() => setShowDemoDrawer(!showDemoDrawer)}
          className="w-full py-1 text-center text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 border-t border-dashed border-border"
        >
          <Sparkles className="h-3 w-3 text-primary" />
          <span>
            {showDemoDrawer ? 'Hide Hackathon Demo Tools' : 'Open Hackathon Demo Console (Email Webhook & Human Specialist Simulator)'}
          </span>
          {showDemoDrawer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showDemoDrawer && (
          <div className="mt-2 p-3 rounded-xl border border-border bg-card shadow-lg text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>Judge & Evaluation Controls for Conversation #{conversationId}</span>
              </div>
              <NextLink
                href="/outbox"
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                <span>View Outbox Emails</span>
              </NextLink>
            </div>

            {demoNotice && (
              <div className="p-2 rounded bg-muted text-foreground border border-border text-[11px]">
                {demoNotice}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Simulator 1: SendGrid Inbound Email Webhook */}
              <div className="p-2.5 rounded-lg border border-border bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    Simulate Customer Email Reply
                  </span>
                  <Badge variant="outline" className="text-[9px]">
                    SendGrid Webhook
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Simulates the customer hitting "Reply" in their email client. Routes to{' '}
                  <code className="text-foreground">POST /api/webhooks/sendgrid</code>.
                </p>
                <Input
                  placeholder="e.g. Thanks, I found the license key! Can I also ask about stems?"
                  value={simulatedEmailText}
                  onChange={(e) => setSimulatedEmailText(e.target.value)}
                  className="text-xs h-7"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSimulateEmailReply}
                  disabled={!simulatedEmailText.trim() || isSimulatingEmail}
                  className="w-full text-xs h-7"
                >
                  {isSimulatingEmail ? 'Ingesting Email Webhook...' : 'Trigger Inbound Email Webhook'}
                </Button>
              </div>

              {/* Simulator 2: Human Support Specialist Reply */}
              <div className="p-2.5 rounded-lg border border-border bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    Reply as Human Specialist
                  </span>
                  <Badge variant="outline" className="text-[9px]">
                    Escalation Resolution
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Simulates a support agent resolving the ticket and sending notification to customer.
                </p>
                <Input
                  placeholder="e.g. I have manually verified your license activation in our system."
                  value={humanAgentReplyText}
                  onChange={(e) => setHumanAgentReplyText(e.target.value)}
                  className="text-xs h-7"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleHumanAgentReply(false)}
                    disabled={!humanAgentReplyText.trim() || isAgentReplying}
                    className="flex-1 text-xs h-7"
                  >
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleHumanAgentReply(true)}
                    disabled={!humanAgentReplyText.trim() || isAgentReplying}
                    className="flex-1 text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Reply & Resolve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Human Escalation Modal */}
      <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Request Human Specialist Assistance</span>
            </DialogTitle>
            <DialogDescription>
              If the Gemini AI agent cannot resolve your issue or if you prefer a human specialist,
              we will immediately alert the {merchant?.name} support team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Reason for Escalation
              </label>
              <select
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
              >
                <option value="Billing dispute or refund request exceeding policy">
                  Billing dispute or refund request exceeding policy
                </option>
                <option value="Damaged or spoiled perishable grocery item">
                  Damaged or spoiled perishable grocery item
                </option>
                <option value="Audio file download or license key corrupted">
                  Audio file download or license key corrupted
                </option>
                <option value="Delivery address change or driver safety issue">
                  Delivery address change or driver safety issue
                </option>
                <option value="General preference for human representative">
                  General preference for human representative
                </option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEscalateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isEscalating}
                onClick={handleEscalate}
                className="gap-2"
              >
                {isEscalating ? 'Escalating...' : 'Confirm Escalation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ConversationThreadPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex-1 max-w-5xl w-full mx-auto p-8 flex items-center justify-center text-sm text-muted-foreground">
          Loading resolution thread...
        </div>
      }
    >
      <ConversationThreadContent />
    </React.Suspense>
  );
}
