import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { getCatalog } from '../integrations/sheets.js';

export async function voiceRoute(app: FastifyInstance): Promise<void> {
  app.get('/catalog', async (_req, reply) => {
    const items = await getCatalog();
    reply.header('Access-Control-Allow-Origin', '*');
    return items;
  });

  app.post('/voice', async (req, reply) => {
    const body = req.body as Record<string, string>;
    const callSid = body?.CallSid ?? 'unknown';
    const from = body?.From ?? 'unknown';
    app.log.info({ callSid, from }, 'Inbound call');

    const wsUrl = config.publicUrl.replace(/^https?/, 'wss') + '/media';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="from" value="${from}" />
    </Stream>
  </Connect>
</Response>`;

    reply.header('Content-Type', 'text/xml');
    return reply.send(twiml);
  });
}
