import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/session';
import { OrderService } from '@/lib/services/orderService';
import { TDStore } from '@/lib/firebase/store';
import { Order } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const customer = await getCurrentCustomer();
    const { searchParams } = new URL(req.url);
    const merchantId = searchParams.get('merchantId') || undefined;
    const orderId = searchParams.get('orderId');

    if (orderId) {
      const order = await TDStore.getOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ order });
    }

    const orders = await OrderService.getOrdersForCustomer(customer.id, merchantId);
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const customer = await getCurrentCustomer();
    const body = await req.json();

    const newOrder: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderId: body.orderId || `ORD-${body.merchantId === 'merchant_music' ? 'MUS' : 'GROC'}-${Math.floor(1000 + Math.random() * 9000)}`,
      merchantId: body.merchantId,
      customerId: customer.id,
      customerEmail: customer.email,
      customerName: customer.name,
      items: body.items || [],
      orderStatus: body.orderStatus || 'processing',
      orderStatusDisplay: body.orderStatusDisplay || 'Order Confirmed & Processing',
      totalAmount: body.totalAmount || 19.99,
      currency: 'USD',
      trackingNumber: `TRK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      estimatedDelivery: body.estimatedDelivery || 'In 1-2 business days',
      deliveryAddress: customer.defaultAddress || 'On file',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in database
    const state = await TDStore.getOrderById(newOrder.orderId);
    if (!state) {
      // In local mode or Firestore, save it
      const { initFirebaseAdmin } = await import('@/lib/firebase/admin');
      const { firestore, isConfigured } = initFirebaseAdmin();
      if (isConfigured && firestore) {
        await firestore.collection('orders').doc(newOrder.orderId).set(newOrder);
      }
    }

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create simulated order' }, { status: 500 });
  }
}
