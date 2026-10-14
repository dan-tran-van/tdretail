import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentCustomer } from '@/lib/session';
import { TDStore } from '@/lib/firebase/store';
import { SEED_CUSTOMERS } from '@/lib/data/seedData';

export async function GET() {
  const customer = await getCurrentCustomer();
  const allCustomers = SEED_CUSTOMERS;
  return NextResponse.json({
    customer,
    availableCustomers: allCustomers,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { customerId } = await req.json();
    const customer = await TDStore.getCustomer(customerId);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const cookieStore = await cookies();
    cookieStore.set('td_customer_id', customer.id, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to switch customer session' }, { status: 500 });
  }
}
