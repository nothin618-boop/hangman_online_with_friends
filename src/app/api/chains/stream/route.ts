import { NextRequest } from 'next/server';
import { getEventBroadcaster } from '@/lib/events';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const playerId =
    req.nextUrl.searchParams.get('playerId') ||
    `anon_${Math.random().toString(36).substring(2, 9)}`;

  const broadcaster = getEventBroadcaster();
  const store = getStore();

  let unregister: (() => void) | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      unregister = broadcaster.registerClient(playerId, controller);

      // Initial telemetry snapshot
      const activeChains = await store.getActiveChains();
      const telemetryPayload = JSON.stringify({
        activeWhispers: activeChains.length,
        playersOnline: broadcaster.getPlayersOnline(),
      });
      controller.enqueue(new TextEncoder().encode(`event: telemetry\ndata: ${telemetryPayload}\n\n`));

      // Heartbeat ping timer (15s)
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          if (unregister) unregister();
        }
      }, 15000);
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (unregister) unregister();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
