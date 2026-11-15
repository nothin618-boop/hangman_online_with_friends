import { NextRequest, NextResponse } from 'next/server';
import { getGhostReceipt, generateGhostTimelineDiffs } from '@/lib/ghosts';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const receipt = await getGhostReceipt(id);

    if (!receipt) {
      return NextResponse.json(
        { success: false, error: 'GHOST_NOT_FOUND', message: `Ghost receipt with ID "${id}" was not found.` },
        { status: 404 }
      );
    }

    const diffs = generateGhostTimelineDiffs(receipt.timeline || []);

    return NextResponse.json({
      success: true,
      receipt,
      diffs,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
