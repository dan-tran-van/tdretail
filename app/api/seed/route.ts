import { NextResponse } from 'next/server';
import { TDStore } from '@/lib/firebase/store';

export async function POST() {
  try {
    const result = await TDStore.seed(true);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API] Error reseeding database:', error);
    return NextResponse.json({ error: 'Failed to reseed database' }, { status: 500 });
  }
}
