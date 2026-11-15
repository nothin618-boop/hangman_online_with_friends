import { NextRequest, NextResponse } from 'next/server';
import { voteJury } from '@/lib/jury';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const caseId = body.caseId;
    const voterPlayerId = body.voterPlayerId || body.voterId || body.peerId;
    const isSabotage = body.isSabotage !== undefined ? body.isSabotage : body.vote;

    if (!caseId || !voterPlayerId || isSabotage === undefined) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PARAMETERS', message: 'caseId, voterPlayerId, and isSabotage are required.' },
        { status: 400 }
      );
    }

    const result = await voteJury(caseId, voterPlayerId, Boolean(isSabotage));

    return NextResponse.json({
      success: true,
      resolved: result.resolved,
      verdict: result.verdict,
      chainRewound: result.chainRewound,
      trollShadowBanned: result.trollShadowBanned,
    });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 400;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
