import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return new Response('roomId required', { status: 400 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const subscribers = (globalThis as any)._rescueSseSubscribers ?? ((globalThis as any)._rescueSseSubscribers = new Map());
  let roomSubs = subscribers.get(roomId);
  if (!roomSubs) {
    roomSubs = new Set();
    subscribers.set(roomId, roomSubs);
  }

  const sendEvent = async (data: any) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      roomSubs.delete(sendEvent);
    }
  };

  roomSubs.add(sendEvent);

  // Initial connection keep-alive
  sendEvent({ type: 'PONG', serverTimestamp: Date.now() });

  req.signal.addEventListener('abort', () => {
    roomSubs.delete(sendEvent);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

