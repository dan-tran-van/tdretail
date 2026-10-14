import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/emailService';
import { TDStore } from '@/lib/firebase/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, replyText, customerEmail, customSubject } = body;

    if (!conversationId || !replyText?.trim()) {
      return NextResponse.json(
        { error: 'conversationId and replyText are required.' },
        { status: 400 }
      );
    }

    const conversation = await TDStore.getConversationById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const senderEmail = customerEmail || conversation.customerEmail;
    const recipientTo = `reply+${conversationId}@inbound.tdretail.example.com`;
    const subject = customSubject || `Re: ${conversation.subject} [Ref: ${conversationId}]`;

    const result = await EmailService.handleInboundEmail({
      from: `${conversation.customerName} <${senderEmail}>`,
      to: recipientTo,
      subject,
      text: replyText.trim(),
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      message: 'Inbound customer email successfully ingested & routed to conversation thread.',
      conversationId,
      aiReply: result.aiReply,
    });
  } catch (error) {
    console.error('[API] Error simulating inbound email reply:', error);
    return NextResponse.json({ error: 'Failed to simulate email reply' }, { status: 500 });
  }
}
