import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { TDStore } from '@/lib/firebase/store';
import { GeminiAgentService } from '@/lib/services/geminiService';
import { EmailService } from '@/lib/services/emailService';
import { Message } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await TDStore.getMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await getCurrentCustomer();
    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    const conversation = await TDStore.getConversationById(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify ownership
    if (conversation.customerId !== customer.id && conversation.customerEmail !== customer.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // 1. Save customer message
    const customerMsg: Message = {
      id: `msg_cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: id,
      sender: 'customer',
      senderName: customer.name,
      content: content.trim(),
      timestamp: now,
    };
    await TDStore.addMessage(customerMsg);

    // 2. Process with Gemini Agent
    const aiMsg = await GeminiAgentService.processMessage({
      conversation,
      customerMessage: content.trim(),
      customer,
    });

    // 3. Dispatch outbound support email for user record with reply-to routing
    await EmailService.sendSupportEmail({
      conversationId: id,
      to: customer.email,
      subject: `Re: ${conversation.subject}`,
      bodyText: aiMsg.content,
      merchantId: conversation.merchantId,
      senderName: aiMsg.senderName,
    });

    // Refresh conversation metadata
    const updatedConv = await TDStore.getConversationById(id);

    return NextResponse.json({
      success: true,
      customerMessage: customerMsg,
      aiMessage: aiMsg,
      conversation: updatedConv,
    });
  } catch (error) {
    console.error('[API] Error posting message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
