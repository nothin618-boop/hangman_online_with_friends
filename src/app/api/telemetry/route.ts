import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getEventBroadcaster } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = getStore();
    const broadcaster = getEventBroadcaster();
    const activeChains = await store.getActiveChains();

    return NextResponse.json({
      activeWhispers: activeChains.length,
      playersOnline: broadcaster.getPlayersOnline(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
