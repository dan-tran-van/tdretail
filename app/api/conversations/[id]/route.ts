import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { TDStore } from '@/lib/firebase/store';
import { OrderService } from '@/lib/services/orderService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await getCurrentCustomer();

    const conversation = await TDStore.getConversationById(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Security check: Customer can only view their own conversations
    if (conversation.customerId !== customer.id && conversation.customerEmail !== customer.email) {
      return NextResponse.json({ error: 'Access denied to this conversation thread' }, { status: 403 });
    }

    const merchant = await TDStore.getMerchantById(conversation.merchantId);
    const messages = await TDStore.getMessages(id);

    // If linked to an order, fetch grounded order details
    let linkedOrder = null;
    if (conversation.orderId) {
      const orderLookup = await OrderService.lookupOrderStatus({
        orderId: conversation.orderId,
        merchantId: conversation.merchantId,
        customerId: customer.id,
        customerEmail: customer.email,
      });
      if (orderLookup.success) {
        linkedOrder = orderLookup.order;
      }
    }

    // Mark as read by customer
    if (conversation.unreadByCustomer) {
      await TDStore.updateConversation(id, { unreadByCustomer: false });
      conversation.unreadByCustomer = false;
    }

    return NextResponse.json({
      conversation,
      merchant,
      linkedOrder,
      messages,
    });
  } catch (error) {
    console.error('[API] Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const updated = await TDStore.updateConversation(id, { status });
    if (!updated) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
