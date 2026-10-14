import { NextRequest, NextResponse } from 'next/server';
import { TDStore } from '@/lib/firebase/store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const merchant = await TDStore.getMerchantById(id);

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    return NextResponse.json({ merchant });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch merchant' }, { status: 500 });
  }
}
