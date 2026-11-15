import { NextRequest, NextResponse } from 'next/server';
import { getQueueEngine } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chainId, playerId, wordIndex, newWord, guess, guessedTheme, role } = body;

    if (!chainId || !playerId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PARAMETERS', message: 'chainId and playerId are required.' },
        { status: 400 }
      );
    }

    const queue = getQueueEngine();

    // 1. Decoder Theme Deduction Path
    if (role === 'decoder' || guess !== undefined || guessedTheme !== undefined) {
      const themeGuess = guess || guessedTheme;
      if (!themeGuess) {
        return NextResponse.json(
          { success: false, error: 'MISSING_GUESS', message: 'A theme deduction guess is required.' },
          { status: 400 }
        );
      }

      const result = await queue.submitDecoderGuess(chainId, playerId, String(themeGuess));
      if (!result.success) {
        const statusCode = result.error === 'CHAIN_NOT_FOUND' ? 404 : 400;
        return NextResponse.json({ success: false, error: result.error, message: result.message }, { status: statusCode });
      }

      return NextResponse.json({
        success: true,
        correct: result.isCorrect,
        bonusAwarded: result.bonusAwarded,
        livesRemaining: result.livesRemaining,
        chain: result.sanitizedChain || result.chain,
        status: result.chain?.status,
      });
    }

    // 2. Shifter Word Replacement Path
    if (wordIndex === undefined || newWord === undefined) {
      return NextResponse.json(
        { success: false, error: 'MISSING_SHIFTER_PARAMS', message: 'wordIndex and newWord are required for shifter role.' },
        { status: 400 }
      );
    }

    const result = await queue.submitMutation(chainId, playerId, Number(wordIndex), String(newWord));
    if (!result.success) {
      const statusCode =
        result.error === 'INVALID_LEASE_HOLDER' || result.error === 'LEASE_EXPIRED'
          ? 403
          : result.error === 'CHAIN_NOT_FOUND'
          ? 404
          : 400;
      return NextResponse.json({ success: false, error: result.error, message: result.message }, { status: statusCode });
    }

    return NextResponse.json({
      success: true,
      chain: result.sanitizedChain || result.chain,
      isTrap: result.isTrap,
      strikeDeducted: result.strikeDeducted,
      livesRemaining: result.livesRemaining,
      status: result.chain?.status,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
