import { NextRequest, NextResponse } from 'next/server';
import { TDStore } from '@/lib/firebase/store';
import { EmailService } from '@/lib/services/emailService';
import { Message } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content, agentName, markResolved } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    const conversation = await TDStore.getConversationById(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const merchant = await TDStore.getMerchantById(conversation.merchantId);
    const merchantName = merchant ? merchant.name : 'Merchant Support';
    const now = new Date().toISOString();

    const humanMsg: Message = {
      id: `msg_human_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: id,
      sender: 'human_agent',
      senderName: agentName || `${merchantName} Support Specialist`,
      content: content.trim(),
      timestamp: now,
    };
    await TDStore.addMessage(humanMsg);

    const newStatus = markResolved ? 'resolved' : 'active';
    const updatedConv = await TDStore.updateConversation(id, {
      status: newStatus,
    });

    // Send email to customer
    await EmailService.sendSupportEmail({
      conversationId: id,
      to: conversation.customerEmail,
      subject: `Re: ${conversation.subject}`,
      bodyText: `A specialist from ${merchantName} has replied to your request:\n\n${content.trim()}`,
      merchantId: conversation.merchantId,
      senderName: humanMsg.senderName,
    });

    return NextResponse.json({
      success: true,
      message: humanMsg,
      conversation: updatedConv,
    });
  } catch (error) {
    console.error('[API] Error adding human agent reply:', error);
    return NextResponse.json({ error: 'Failed to post agent reply' }, { status: 500 });
  }
}
