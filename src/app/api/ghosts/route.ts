import { NextResponse } from 'next/server';
import { listGhostReceipts } from '@/lib/ghosts';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const receipts = await listGhostReceipts();
    return NextResponse.json({
      success: true,
      receipts,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
