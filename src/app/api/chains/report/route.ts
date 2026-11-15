import { NextRequest, NextResponse } from 'next/server';
import { reportSabotage } from '@/lib/jury';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const chainId = body.chainId;
    const reporterPlayerId = body.reporterPlayerId || body.reporterId;

    if (!chainId || !reporterPlayerId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PARAMETERS', message: 'chainId and reporterPlayerId are required.' },
        { status: 400 }
      );
    }

    const juryCase = await reportSabotage(chainId, reporterPlayerId);

    return NextResponse.json({
      success: true,
      caseId: juryCase.id,
      status: juryCase.status,
      message: 'Sabotage report submitted. Peer jury convened.',
    });
  } catch (err: any) {
    const status = err.message?.includes('already pending')
      ? 409
      : err.message?.includes('not found')
      ? 404
      : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
