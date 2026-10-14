import { NextResponse } from 'next/server';
import { TDStore } from '@/lib/firebase/store';

export async function GET() {
  try {
    const emails = await TDStore.getOutboxEmails();
    return NextResponse.json({ emails });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch outbox emails' }, { status: 500 });
  }
}
