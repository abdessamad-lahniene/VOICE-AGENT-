import type { FastifyInstance } from 'fastify';

export async function whatsappRoute(app: FastifyInstance): Promise<void> {
  // Receives delivery status callbacks from Twilio WhatsApp
  app.post('/wa/status', async (req, reply) => {
    const body = req.body as Record<string, string>;
    app.log.info({ sid: body.MessageSid, status: body.MessageStatus }, 'WA status');
    return reply.send('ok');
  });
}
