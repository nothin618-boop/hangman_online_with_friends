export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      process.env.WS_NO_BUFFER_UTIL = 'true';
      const { startWsServer } = await import('../server/multiplayer_ws.js');
      startWsServer();
    } catch (e: any) {
      console.warn('[CyberRescue] Auto-start WS notice:', e?.message || e);
    }
  }
}
