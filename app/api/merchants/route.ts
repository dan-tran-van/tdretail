import { NextResponse } from 'next/server';
import { TDStore } from '@/lib/firebase/store';

export async function GET() {
  try {
    const merchants = await TDStore.getMerchants();
    return NextResponse.json({ merchants });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch merchants' }, { status: 500 });
  }
}
