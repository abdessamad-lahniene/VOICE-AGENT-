import 'dotenv/config';
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { config } from './config.js';
import { voiceRoute } from './routes/voice.js';
import { mediaRoute } from './routes/media.js';
import { whatsappRoute } from './routes/whatsapp.js';

const app = Fastify({
  logger: {
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

await app.register(fastifyWebsocket);

// Parse URL-encoded bodies (Twilio webhook format)
app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
  try {
    const parsed = Object.fromEntries(new URLSearchParams(body as string));
    done(null, parsed);
  } catch (err) {
    done(err as Error, undefined);
  }
});

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

await app.register(voiceRoute);
await app.register(mediaRoute);
await app.register(whatsappRoute);

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Voice agent running on ${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
