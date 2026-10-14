import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { TDStore } from '@/lib/firebase/store';
import { OrderService } from '@/lib/services/orderService';
import { GeminiAgentService } from '@/lib/services/geminiService';
import { EmailService } from '@/lib/services/emailService';
import { Conversation, Message } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const customer = await getCurrentCustomer();
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get('merchantId') || undefined;

    const conversations = await TDStore.getConversations(customer.id, merchantId);
    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const customer = await getCurrentCustomer();
    const body = await req.json();
    const { merchantId, orderId, subject, initialMessage } = body;

    if (!merchantId || !subject?.trim()) {
      return NextResponse.json(
        { error: 'merchantId and subject are required.' },
        { status: 400 }
      );
    }

    const merchant = await TDStore.getMerchantById(merchantId);
    if (!merchant) {
      return NextResponse.json({ error: 'Invalid merchant ID.' }, { status: 400 });
    }

    // Strict validation if orderId is provided
    if (orderId) {
      const orderCheck = await OrderService.lookupOrderStatus({
        orderId,
        merchantId,
        customerId: customer.id,
        customerEmail: customer.email,
      });

      if (!orderCheck.success) {
        return NextResponse.json(
          { error: `Cannot associate order: ${orderCheck.error}` },
          { status: 400 }
        );
      }
    }

    const convId = `conv_${merchant.category === 'digital_music' ? 'music' : 'grocery'}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const newConv: Conversation = {
      id: convId,
      customerId: customer.id,
      customerEmail: customer.email,
      customerName: customer.name,
      merchantId,
      orderId: orderId || null,
      subject: subject.trim(),
      status: 'active',
      lastMessageSnippet: initialMessage || 'Conversation started.',
      lastMessageSender: 'customer',
      lastMessageAt: now,
      unreadByCustomer: false,
      createdAt: now,
      updatedAt: now,
    };

    await TDStore.createConversation(newConv);

    let customerMsg: Message | null = null;
    let aiMsg: Message | null = null;

    if (initialMessage && initialMessage.trim()) {
      customerMsg = {
        id: `msg_cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        conversationId: convId,
        sender: 'customer',
        senderName: customer.name,
        content: initialMessage.trim(),
        timestamp: now,
      };
      await TDStore.addMessage(customerMsg);

      // Trigger Gemini Agent
      aiMsg = await GeminiAgentService.processMessage({
        conversation: newConv,
        customerMessage: initialMessage.trim(),
        customer,
      });

      // Dispatch outgoing confirmation & AI reply email with Reply-To routing!
      await EmailService.sendSupportEmail({
        conversationId: convId,
        to: customer.email,
        subject: newConv.subject,
        bodyText: `Your support request has been received by ${merchant.name}.\n\nAI Resolution:\n${aiMsg.content}`,
        merchantId,
        senderName: aiMsg.senderName,
      });
    }

    return NextResponse.json({
      success: true,
      conversation: newConv,
      messages: [customerMsg, aiMsg].filter(Boolean),
    });
  } catch (error) {
    console.error('[API] Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
