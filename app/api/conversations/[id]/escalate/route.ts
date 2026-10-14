import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { TDStore } from '@/lib/firebase/store';
import { EmailService } from '@/lib/services/emailService';
import { Message } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await getCurrentCustomer();
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Customer requested live human specialist assistance';

    const conversation = await TDStore.getConversationById(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.customerId !== customer.id && conversation.customerEmail !== customer.email) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const merchant = await TDStore.getMerchantById(conversation.merchantId);
    const merchantName = merchant ? merchant.name : 'Merchant Support';

    // Update conversation status
    const updated = await TDStore.updateConversation(id, {
      status: 'escalated',
      escalationReason: reason,
    });

    const now = new Date().toISOString();

    // System audit message in thread
    const systemMsg: Message = {
      id: `msg_sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: id,
      sender: 'system',
      senderName: 'TD Retail Escalation Dispatch',
      content: `Ticket escalated to a human specialist at ${merchantName}. Reason: "${reason}". An agent has been alerted and will join this thread.`,
      metadata: {
        escalationTriggered: true,
      },
      timestamp: now,
    };
    await TDStore.addMessage(systemMsg);

    // Notify merchant support via email
    if (merchant) {
      await EmailService.sendSupportEmail({
        conversationId: id,
        to: merchant.supportEmail,
        subject: `[ESCALATION ALERT] ${conversation.subject} [Ref: ${id}]`,
        bodyText: `Customer ${customer.name} (${customer.email}) has requested live human specialist review for conversation ${id}.\nReason: ${reason}\nOrder Reference: ${conversation.orderId || 'None'}`,
        merchantId: merchant.id,
      });
    }

    return NextResponse.json({
      success: true,
      conversation: updated,
      systemMessage: systemMsg,
    });
  } catch (error) {
    console.error('[API] Error escalating conversation:', error);
    return NextResponse.json({ error: 'Failed to escalate conversation' }, { status: 500 });
  }
}
