'use client';

import React, { useState, useEffect, useRef } from 'react';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
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
  Package,
  Key,
  CornerDownRight,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Conversation, Merchant, Message, Customer } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Suspense } from 'react';

function ConversationThreadInner() {
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
  const [isOrderExpanded, setIsOrderExpanded] = useState(false);

  // Tool Call inspector expanded per message
  const [expandedToolCalls, setExpandedToolCalls] = useState<Record<string, boolean>>({});

  // Human escalation modal
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalationReason, setEscalationReason] = useState('Requires specialized human assistance');
  const [isEscalating, setIsEscalating] = useState(false);

  // Demo Judge Actions Console
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const [simulatedEmailText, setSimulatedEmailText] = useState('');
  const [isSimulatingEmail, setIsSimulatingEmail] = useState(false);
  const [humanAgentReplyText, setHumanAgentReplyText] = useState('');
  const [isAgentReplying, setIsAgentReplying] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
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

        const newMessages: Message[] = data.messages || [];
        setMessages((prev) => {
          // Compare message count or IDs to avoid re-triggering state when identical
          if (
            prev.length === newMessages.length &&
            prev[prev.length - 1]?.id === newMessages[newMessages.length - 1]?.id
          ) {
            return prev;
          }
          return newMessages;
        });
      }

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
    const interval = setInterval(() => {
      loadThreadData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    if (messages.length === 0) return;

    // Only scroll on initial load or when new messages actually arrive
    if (isInitialLoadRef.current) {
      scrollToBottom('auto');
      isInitialLoadRef.current = false;
      prevMessagesCountRef.current = messages.length;
    } else if (messages.length > prevMessagesCountRef.current) {
      scrollToBottom('smooth');
      prevMessagesCountRef.current = messages.length;
    }
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
    if (!conversation) return;
    const newStatus = conversation.status === 'resolved' ? 'active' : 'resolved';
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadThreadData(true);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSimulateInboundEmail = async () => {
    if (!conversation || !simulatedEmailText.trim()) return;
    setIsSimulatingEmail(true);
    setDemoNotice(null);

    try {
      const res = await fetch('/api/webhooks/sendgrid/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: customer?.email || 'sarah.connor@example.com',
          toEmail: `support+thread_${conversation.id}@support.tdretail.example.com`,
          subject: `Re: ${conversation.subject}`,
          bodyText: simulatedEmailText,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setDemoNotice('Email reply received via webhook! Gemini AI reply queued.');
        setSimulatedEmailText('');
        await loadThreadData(true);
      } else {
        setDemoNotice(data.error || 'Failed to simulate email');
      }
    } catch (err: any) {
      setDemoNotice(err.message || 'Network error');
    } finally {
      setIsSimulatingEmail(false);
    }
  };

  const handleHumanAgentReply = async () => {
    if (!conversation || !humanAgentReplyText.trim()) return;
    setIsAgentReplying(true);
    setDemoNotice(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/agent-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: humanAgentReplyText,
          agentName: `${merchant?.name || 'Store'} Specialist Support`,
        }),
      });

      if (res.ok) {
        setDemoNotice('Human specialist message sent!');
        setHumanAgentReplyText('');
        await loadThreadData(true);
      } else {
        const data = await res.json();
        setDemoNotice(data.error || 'Failed to send agent reply');
      }
    } catch (err: any) {
      setDemoNotice(err.message || 'Network error');
    } finally {
      setIsAgentReplying(false);
    }
  };

  const isMusic = merchant?.category === 'digital_music';

  return (
    <>
    <div className="flex-1 flex flex-col h-full overflow-hidden">
        {loading && !conversation ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !conversation ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
            <div className="space-y-2">
              <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
              <p className="font-semibold text-foreground">Conversation Not Found</p>
              <NextLink href="/inbox">
                <Button variant="outline" size="sm" className="mt-2 text-xs">
                  Back to Inbox
                </Button>
              </NextLink>
            </div>
          </div>
        ) : (
          <>
            {/* Modern Chat Header */}
            <div className="px-4 py-3 sm:px-6 border-b border-border/80 flex items-center justify-between gap-3 shrink-0 bg-card/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
                  {isMusic ? (
                    <Disc className="h-4 w-4 text-primary" />
                  ) : (
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
                      {conversation.subject}
                    </h2>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 hidden sm:inline-flex">
                      {merchant?.name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{merchant?.supportEmail}</span>
                    <span>•</span>
                    <span className="font-mono">Thread #{conversation.id}</span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {conversation.status === 'active' && (
                  <Badge variant="secondary" className="text-[11px] h-6 px-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mr-1 animate-pulse" />
                    Active AI
                  </Badge>
                )}
                {conversation.status === 'escalated' && (
                  <Badge variant="destructive" className="text-[11px] h-6 px-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Escalated
                  </Badge>
                )}
                {conversation.status === 'resolved' && (
                  <Badge variant="outline" className="text-[11px] h-6 px-2">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-primary" />
                    Resolved
                  </Badge>
                )}

                {conversation.status !== 'escalated' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEscalateDialog(true)}
                    className="text-xs h-7 px-2"
                    title="Escalate to human specialist"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1 text-muted-foreground" />
                    <span className="hidden sm:inline">Request Human</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResolve}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  {conversation.status === 'resolved' ? 'Re-open' : 'Resolve'}
                </Button>
              </div>
            </div>

            {/* Linked Order Grounding Summary Bar (Collapsible) */}
            {linkedOrder && (
              <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground">
                      Grounded Order: <span className="font-mono">#{linkedOrder.orderId}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {linkedOrder.orderStatusDisplay}
                    </Badge>
                  </div>

                  <button
                    onClick={() => setIsOrderExpanded(!isOrderExpanded)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px]"
                  >
                    <span>{isOrderExpanded ? 'Hide Info' : 'Show Info'}</span>
                    {isOrderExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {isOrderExpanded && (
                  <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground block">Items:</span>
                      <span className="truncate block">
                        {linkedOrder.items?.map((i: any) => `${i.title} (${i.quantity}x)`).join(', ')}
                      </span>
                    </div>

                    {linkedOrder.estimatedDelivery && (
                      <div>
                        <span className="font-semibold text-foreground block">Delivery Status:</span>
                        <span className="truncate block">{linkedOrder.estimatedDelivery}</span>
                      </div>
                    )}

                    {linkedOrder.items[0]?.licenseKey && (
                      <div>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Key className="h-2.5 w-2.5 text-primary" />
                          License Key:
                        </span>
                        <code className="font-mono bg-background px-1 py-0.5 rounded border border-border">
                          {linkedOrder.items[0].licenseKey}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Message History */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg) => {
                const isCustomer = msg.sender === 'customer';
                const isAI = msg.sender === 'ai';
                const isHuman = msg.sender === 'human_agent';
                const isSystem = msg.sender === 'system';
                const hasToolCalls = msg.metadata?.toolCalls && msg.metadata.toolCalls.length > 0;
                const isExpanded = expandedToolCalls[msg.id];

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="px-3 py-1 rounded-full bg-muted border border-border text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                        <span>{msg.content}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%] ${isCustomer ? 'ml-auto' : 'mr-auto'
                      }`}
                  >
                    {/* Sender Label */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-muted-foreground">
                      {isCustomer ? (
                        <>
                          <span>You ({customer?.name || 'Customer'})</span>
                          <User className="h-3 w-3" />
                        </>
                      ) : isAI ? (
                        <>
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="font-semibold text-foreground">Gemini Support Agent</span>
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1 uppercase">
                            AI Grounded
                          </Badge>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3 w-3 text-primary" />
                          <span className="font-semibold text-foreground">
                            {msg.metadata?.agentName || 'Merchant Specialist'}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(msg.timestamp || msg.createdAt || Date.now()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${isCustomer
                        ? 'bg-primary-foreground text-foreground rounded-br-xs shadow-xs'
                        : 'bg-card border border-border text-card-foreground rounded-bl-xs shadow-xs'
                        }`}
                    >
                      {isCustomer ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_code]:bg-muted [&_code]:text-foreground [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[11px] [&_code]:font-mono [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-border [&_th]:p-1.5 [&_th]:bg-muted/50 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-1.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_h1]:text-base [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:my-1.5 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Gemini Tool Calls Inspector */}
                    {hasToolCalls && (
                      <div className="mt-1.5 w-full">
                        <button
                          onClick={() => toggleToolCall(msg.id)}
                          className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2.5 py-1 rounded-md border border-border transition-colors"
                        >
                          <ShieldCheck className="h-3 w-3 text-primary" />
                          <span>
                            {msg.metadata?.toolCalls?.length} Server Tool Executed (
                            {msg.metadata?.toolCalls?.map((t: any) => t.toolName).join(', ')})
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3 ml-auto" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-auto" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-1 p-2.5 rounded-lg border border-border bg-muted/60 text-[11px] font-mono space-y-2">
                            {msg.metadata?.toolCalls?.map((tc: any, idx: number) => (
                              <div key={idx} className="space-y-1">
                                <div className="text-foreground font-semibold flex items-center gap-1">
                                  <CornerDownRight className="h-3 w-3 text-primary" />
                                  <span>{tc.toolName}</span>
                                </div>
                                <pre className="text-foreground text-[10px] bg-background p-2 rounded border border-border overflow-x-auto">
                                  {JSON.stringify(tc.arguments, null, 2)}
                                </pre>
                                <span className="text-muted-foreground text-[10px] block">
                                  Tenant Response:
                                </span>
                                <pre className="text-foreground text-[10px] bg-background p-2 rounded border border-border overflow-x-auto">
                                  {JSON.stringify(tc.result, null, 2)}
                                </pre>
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
              <div className="px-4 py-2 overflow-x-auto flex items-center gap-1.5 shrink-0 bg-background border-t border-border/40">
                <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                  Suggested:
                </span>
                {merchant.demoPromptSuggestions.slice(0, 3).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(prompt)}
                    className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-muted/70 hover:bg-muted border border-border text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="p-3 sm:p-4 border-t border-border/80 bg-background shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                <Textarea
                  placeholder={`Ask ${merchant?.name} support (Gemini verifies order grounding)...`}
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
                  className="resize-none text-xs sm:text-sm min-h-[40px] max-h-[90px] flex-1 py-2"
                />

                <Button
                  type="submit"
                  disabled={!inputText.trim() || isSending || conversation.status === 'resolved'}
                  className="h-10 px-4 gap-1.5"
                >
                  {isSending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline text-xs">Send</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Hackathon Demo Drawer Toggle */}
              <div className="mt-2 text-center">
                <button
                  onClick={() => setShowDemoDrawer(!showDemoDrawer)}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>
                    {showDemoDrawer ? 'Hide Demo Simulator' : 'Simulate Email Webhook & Specialist'}
                  </span>
                  {showDemoDrawer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Simulator Drawer */}
              {showDemoDrawer && (
                <div className="mt-3 p-3 rounded-xl border border-border bg-card shadow-xs text-xs space-y-3 max-w-3xl mx-auto">
                  <div className="font-semibold text-foreground flex items-center justify-between border-b border-border pb-1.5">
                    <span>Judge / Demo Tools</span>
                    <Badge variant="outline" className="text-[10px]">
                      SendGrid & Specialist Simulation
                    </Badge>
                  </div>

                  {demoNotice && (
                    <div className="p-2 rounded bg-muted text-foreground text-[11px] border border-border">
                      {demoNotice}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Email Webhook simulation */}
                    <div className="space-y-1.5 border border-border p-2.5 rounded-lg bg-background">
                      <span className="font-semibold text-foreground block text-[11px]">
                        1. Simulate Email Reply Ingestion
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Customer replies via email app..."
                        value={simulatedEmailText}
                        onChange={(e) => setSimulatedEmailText(e.target.value)}
                        className="w-full p-2 text-xs rounded border border-border bg-background resize-none"
                      />
                      <Button
                        size="sm"
                        disabled={isSimulatingEmail || !simulatedEmailText.trim()}
                        onClick={handleSimulateInboundEmail}
                        className="w-full text-xs h-7 gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        <span>Trigger Inbound Email Webhook</span>
                      </Button>
                    </div>

                    {/* Human Specialist simulation */}
                    <div className="space-y-1.5 border border-border p-2.5 rounded-lg bg-background">
                      <span className="font-semibold text-foreground block text-[11px]">
                        2. Simulate Human Specialist Takeover
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Human agent reply text..."
                        value={humanAgentReplyText}
                        onChange={(e) => setHumanAgentReplyText(e.target.value)}
                        className="w-full p-2 text-xs rounded border border-border bg-background resize-none"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isAgentReplying || !humanAgentReplyText.trim()}
                        onClick={handleHumanAgentReply}
                        className="w-full text-xs h-7 gap-1"
                      >
                        <UserCheck className="h-3 w-3" />
                        <span>Send Specialist Message</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
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
              Alert the {merchant?.name} support team for live assistance.
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
    </>
  );
}

export default function ConversationThreadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <ConversationThreadInner />
    </Suspense>
  );
}
