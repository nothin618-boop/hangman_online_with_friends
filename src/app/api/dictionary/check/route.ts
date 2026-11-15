import { NextRequest, NextResponse } from 'next/server';
import { isDictionaryWord } from '@/lib/dictionary';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get('word') || '';
  const valid = isDictionaryWord(word);
  return NextResponse.json({ valid, word });
}

