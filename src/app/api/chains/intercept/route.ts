import { NextRequest, NextResponse } from 'next/server';
import { getQueueEngine } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerId = body.playerId || `anon_${Math.random().toString(36).substring(2, 9)}`;

    const queue = getQueueEngine();
    const result = await queue.interceptChain(playerId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'NO_ACTIVE_CHAINS', message: 'No active whispers available.' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      chain: result.chain,
      role: result.role,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
