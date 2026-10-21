import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { createSession, deleteSession } from '../session/store.js';
import { createOpenAIRealtimeClient } from '../realtime/openaiClient.js';

export async function mediaRoute(app: FastifyInstance): Promise<void> {
  app.get('/media', { websocket: true }, (socket: WebSocket) => {
    let callSid: string | null = null;
    let streamSid: string | null = null;
    let openai: ReturnType<typeof createOpenAIRealtimeClient> | null = null;

    function sendToTwilio(event: Record<string, unknown>): void {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(event));
      }
    }

    socket.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const event = msg.event as string;

      if (event === 'connected') {
        app.log.info('Twilio Media Stream connected');

      } else if (event === 'start') {
        const start = msg.start as Record<string, unknown>;
        streamSid = msg.streamSid as string;
        callSid = (start.callSid ?? (start.customParameters as Record<string, string>)?.callSid) as string;
        const from = (start.customParameters as Record<string, string>)?.from ?? 'unknown';

        app.log.info({ callSid, streamSid, from }, 'Media stream started');

        const session = createSession(callSid, from);

        openai = createOpenAIRealtimeClient(
          session,
          (base64Audio) => {
            sendToTwilio({ event: 'media', streamSid, media: { payload: base64Audio } });
          },
          () => {
            sendToTwilio({ event: 'clear', streamSid });
          },
          app.log
        );

      } else if (event === 'media') {
        const payload = (msg.media as Record<string, string>).payload;
        openai?.sendAudio(payload);

      } else if (event === 'stop') {
        app.log.info({ callSid }, 'Media stream stopped');
        openai?.close();
        if (callSid) deleteSession(callSid);
      }
    });

    socket.on('close', () => {
      openai?.close();
      if (callSid) deleteSession(callSid);
    });

    socket.on('error', (err) => {
      app.log.error({ err }, 'Twilio WS error');
    });
  });
}
