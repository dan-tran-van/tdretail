import sgMail from '@sendgrid/mail';
import { TDStore } from '@/lib/firebase/store';
import { OutboxEmail, Message } from '@/lib/types';

export interface SendSupportEmailParams {
  conversationId: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  merchantId: string;
  senderName?: string;
}

export class EmailService {
  private static isSendGridConfigured(): boolean {
    const key = process.env.SENDGRID_API_KEY;
    return Boolean(key && key.startsWith('SG.'));
  }

  /**
   * Sends an outgoing support email or records it to the local outbox if SendGrid is unconfigured.
   * Configures Reply-To address to enable seamless inbound reply routing back to the conversation thread.
   */
  static async sendSupportEmail(params: SendSupportEmailParams): Promise<OutboxEmail> {
    const { conversationId, to, subject, bodyText, bodyHtml, merchantId, senderName } = params;

    const merchant = await TDStore.getMerchantById(merchantId);
    const merchantName = merchant ? merchant.name : 'TD Retail Support';
    const merchantEmail = merchant ? merchant.supportEmail : 'support@tdretail.example.com';

    // Inbound reply routing address format: reply+{conversationId}@{domain}
    const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN || 'inbound.tdretail.example.com';
    const replyToAddress = `reply+${conversationId}@${inboundDomain}`;
    const formattedSubject = subject.includes(`[Ref: ${conversationId}]`)
      ? subject
      : `[${merchantName}] ${subject} [Ref: ${conversationId}]`;

    const htmlContent =
      bodyHtml ||
      `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="border-bottom: 2px solid ${merchant?.brandColor || '#4f46e5'}; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; color: #1e293b;">${merchantName}</h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">TD Retail Customer Support Resolution</p>
        </div>
        <div style="font-size: 15px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${bodyText}</div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          Direct Reply Enabled: You can reply directly to this email to continue your support conversation without logging in.<br/>
          Reference Thread ID: <strong>${conversationId}</strong> | Merchant: <strong>${merchantName}</strong>
        </p>
      </div>
    `;

    const emailRecord: OutboxEmail = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId,
      merchantId,
      merchantName,
      to,
      from: `${merchantName} Support <${merchantEmail}>`,
      replyTo: replyToAddress,
      subject: formattedSubject,
      bodyText,
      bodyHtml: htmlContent,
      status: 'simulated',
      sentAt: new Date().toISOString(),
      simulatedWebhookPayload: {
        from: to,
        to: replyToAddress,
        subject: `Re: ${formattedSubject}`,
        text: 'Thank you, this clarifies my question!',
        headers: {
          'Message-ID': `<${Date.now()}@mail.example.com>`,
          'In-Reply-To': `<${conversationId}@tdretail>`,
        },
      },
    };

    if (this.isSendGridConfigured()) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
        await sgMail.send({
          to,
          from: {
            name: `${merchantName} Support`,
            email: process.env.SENDGRID_FROM_EMAIL || 'support@tdretail.example.com',
          },
          replyTo: replyToAddress,
          subject: formattedSubject,
          text: bodyText,
          html: htmlContent,
        });
        emailRecord.status = 'sent';
        console.log(`[EmailService] Sent email to ${to} via SendGrid API`);
      } catch (error) {
        console.error('[EmailService] SendGrid delivery error (falling back to local outbox logging):', error);
      }
    } else {
      console.log(`[EmailService] SendGrid unconfigured. Logged to local development outbox for ${to}`);
    }

    await TDStore.addOutboxEmail(emailRecord);
    return emailRecord;
  }

  /**
   * Helper to parse and extract conversationId from SendGrid inbound parse payload.
   * Matches patterns like:
   *  - to: "reply+conv_music_01@inbound.tdretail.example.com"
   *  - to: "conv_music_01@inbound.tdretail.example.com"
   *  - subject: "[SoundWave] Stems inquiry [Ref: conv_music_01]"
   */
  static extractConversationId(to: string, subject: string): string | null {
    // 1. Check To header for reply+{convId}@ or {convId}@
    const toMatch = to.match(/(?:reply\+)?([a-zA-Z0-9_-]+)@/i);
    if (toMatch && toMatch[1]) {
      const candidate = toMatch[1].trim();
      if (candidate.startsWith('conv_')) {
        return candidate;
      }
    }

    // 2. Check Subject header for [Ref: {convId}] or [Thread: {convId}]
    const subjectMatch = subject.match(/\[(?:Ref|Thread):\s*([a-zA-Z0-9_-]+)\]/i);
    if (subjectMatch && subjectMatch[1]) {
      return subjectMatch[1].trim();
    }

    return null;
  }

  /**
   * Ingests an inbound customer reply email, appends it to the thread,
   * runs the Gemini Agent, and dispatches a follow-up email response.
   */
  static async handleInboundEmail(payload: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ success: boolean; messageId?: string; aiReply?: string; error?: string }> {
    const { from, to, subject, text } = payload;

    const conversationId = this.extractConversationId(to, subject);
    if (!conversationId) {
      return {
        success: false,
        error: `Could not identify conversation thread ID from recipient "${to}" or subject "${subject}".`,
      };
    }

    const conversation = await TDStore.getConversationById(conversationId);
    if (!conversation) {
      return {
        success: false,
        error: `Conversation "${conversationId}" was not found in TD Retail.`,
      };
    }

    // Clean customer email from sender string (e.g. "Sarah Connor <sarah.connor@example.com>")
    const emailMatch = from.match(/<([^>]+)>/) || [null, from];
    const senderEmail = (emailMatch[1] || from).trim().toLowerCase();

    // Verify sender matches conversation customer email
    if (senderEmail !== conversation.customerEmail.toLowerCase()) {
      return {
        success: false,
        error: `Security Verification Failed: Sender "${senderEmail}" does not match the registered customer email "${conversation.customerEmail}".`,
      };
    }

    // Ingest the customer reply
    const customerMsg: Message = {
      id: `msg_inbound_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId,
      sender: 'customer',
      senderName: conversation.customerName,
      content: text.trim(),
      metadata: {
        inboundEmailFrom: senderEmail,
      },
      timestamp: new Date().toISOString(),
    };
    await TDStore.addMessage(customerMsg);

    // Dynamic import to avoid circular dependency
    const { GeminiAgentService } = await import('@/lib/services/geminiService');

    // Run Gemini support agent
    const aiResult = await GeminiAgentService.processMessage({
      conversation,
      customerMessage: text.trim(),
      customer: {
        id: conversation.customerId,
        name: conversation.customerName,
        email: conversation.customerEmail,
        createdAt: '',
      },
    });

    // Send AI reply back via email so the customer receives it in their inbox!
    await this.sendSupportEmail({
      conversationId,
      to: conversation.customerEmail,
      subject: `Re: ${conversation.subject}`,
      bodyText: aiResult.content,
      merchantId: conversation.merchantId,
      senderName: aiResult.senderName,
    });

    return {
      success: true,
      messageId: customerMsg.id,
      aiReply: aiResult.content,
    };
  }
}
