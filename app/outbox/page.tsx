'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Mail,
  Disc,
  ShoppingBag,
  RefreshCw,
  CornerUpLeft,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModernAppShell } from '@/components/ModernAppShell';
import { OutboxEmail } from '@/lib/types';

export default function OutboxPage() {
  const [emails, setEmails] = useState<OutboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<OutboxEmail | null>(null);
  const [loading, setLoading] = useState(true);

  // Email simulation modal state
  const [isSimulating, setIsSimulating] = useState(false);
  const [replyText, setReplyText] = useState('Thank you, this solved my issue!');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [simStatus, setSimStatus] = useState<string | null>(null);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/outbox');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        if (data.emails && data.emails.length > 0 && !selectedEmail) {
          setSelectedEmail(data.emails[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching outbox:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

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
        setSimStatus('Reply ingested into conversation thread and Gemini AI triggered.');
        setTimeout(() => {
          setIsSimulating(false);
        }, 1500);
      } else {
        setSimStatus(data.error || 'Failed to simulate reply');
      }
    } catch (err: any) {
      setSimStatus(err.message || 'Network error');
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <ModernAppShell onRefresh={loadEmails}>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-card/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Email Outbox Inspector
              </h1>
              <Badge variant="secondary" className="text-xs">
                SendGrid Inbound Parse
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Inspect outgoing notifications and test replying directly to simulate customer email client replies.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadEmails}
            disabled={loading}
            className="gap-2 text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Master-Detail Outbox Inspector Split */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Email List Left Column */}
          <div className="md:col-span-5 lg:col-span-4 border-r border-border h-full overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Outgoing Emails ({emails.length})</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
                Loading outbox...
              </div>
            ) : emails.length === 0 ? (
              <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
                <Mail className="h-7 w-7 mx-auto mb-2 opacity-40" />
                <p>No outgoing support emails recorded yet.</p>
              </Card>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                const isMusic = email.merchantId === 'merchant_music';

                return (
                  <Card
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`cursor-pointer transition-all border text-left ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/40 bg-card shadow-xs'
                        : 'hover:bg-muted/40 border-border/80 bg-card/60'
                    }`}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isMusic ? (
                            <Disc className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-foreground truncate">
                            {email.merchantName}
                          </span>
                        </div>

                        <Badge
                          variant={email.status === 'sent' ? 'default' : 'secondary'}
                          className="text-[9px] h-4 px-1.5 shrink-0"
                        >
                          {email.status === 'sent' ? 'Sent' : 'Queued'}
                        </Badge>
                      </div>

                      <p className="text-xs font-medium text-foreground truncate">
                        {email.subject}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[140px]">To: {email.to}</span>
                        <span>{new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Email Preview & Simulation Right Column */}
          <div className="md:col-span-7 lg:col-span-8 h-full overflow-y-auto p-4 sm:p-6 bg-muted/20">
            {selectedEmail ? (
              <div className="space-y-4 max-w-3xl mx-auto">
                {/* Email Header Card */}
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3 border-b border-border space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-foreground truncate">
                        {selectedEmail.subject}
                      </h2>

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
                            <span>View Thread</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </NextLink>
                      </div>
                    </div>

                    <div className="space-y-1 font-mono text-xs bg-muted/50 p-2.5 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16 shrink-0">From:</span>
                        <span className="text-foreground">{selectedEmail.from}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16 shrink-0">To:</span>
                        <span className="text-foreground">{selectedEmail.to}</span>
                      </div>
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        <span className="text-muted-foreground w-16 shrink-0 font-normal">Reply-To:</span>
                        <span>{selectedEmail.replyTo}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Body */}
                    <div className="rounded-xl border border-border p-4 bg-background min-h-[160px]">
                      {selectedEmail.bodyHtml ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                          className="prose prose-sm dark:prose-invert max-w-none text-xs"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap font-sans text-xs text-foreground leading-relaxed">
                          {selectedEmail.bodyText}
                        </div>
                      )}
                    </div>

                    {/* Inbound Routing Banner */}
                    <div className="p-3 rounded-xl border border-border bg-muted/40 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>SendGrid Inbound Parse Mechanism</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        When the customer replies via their email client to{' '}
                        <code className="bg-background px-1 py-0.5 rounded border border-border font-mono text-[10px] text-foreground">
                          {selectedEmail.replyTo}
                        </code>
                        , SendGrid webhooks route the incoming message into this conversation thread and trigger Gemini.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center text-muted-foreground">
                <div className="space-y-2">
                  <Mail className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-sm font-medium">Select an email to view full content</p>
                </div>
              </div>
            )}
          </div>
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
              Test SendGrid Inbound Parse webhook reply ingestion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {simStatus && (
              <div className="p-2.5 rounded-lg text-xs bg-muted text-foreground border border-border">
                {simStatus}
              </div>
            )}

            <div className="space-y-1 font-mono text-xs bg-muted/50 p-2 rounded border border-border">
              <div>
                <span className="text-muted-foreground">To:</span> {selectedEmail?.replyTo}
              </div>
              <div>
                <span className="text-muted-foreground">From:</span> {selectedEmail?.to}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Customer Reply Content</label>
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
                <span>Send Webhook</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ModernAppShell>
  );
}
