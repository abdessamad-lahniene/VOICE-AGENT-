import WebSocket from 'ws';
import { config } from '../config.js';
import { toolDefinitions, executeTool, type ToolName } from '../tools/index.js';
import { buildSystemPrompt } from './systemPrompt.js';
import type { Session } from '../session/store.js';
import type { FastifyBaseLogger } from 'fastify';

export type AudioDeltaCallback = (base64Audio: string) => void;
export type ClearCallback = () => void;

export function createOpenAIRealtimeClient(
  session: Session,
  onAudioDelta: AudioDeltaCallback,
  onClear: ClearCallback,
  log: FastifyBaseLogger
): {
  ws: WebSocket;
  sendAudio: (base64: string) => void;
  commitAudio: () => void;
  close: () => void;
} {
  const ws = new WebSocket(
    `wss://api.openai.com/v1/realtime?model=${config.openai.model}`,
    {
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    }
  );

  ws.on('open', () => {
    log.info('OpenAI Realtime connected');

    ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions: buildSystemPrompt(),
        voice: 'alloy',
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
        },
        tools: toolDefinitions,
        tool_choice: 'auto',
      },
    }));

    // Trigger initial greeting
    ws.send(JSON.stringify({ type: 'response.create' }));
  });

  ws.on('message', async (raw) => {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const type = event.type as string;

    if (type === 'response.audio.delta') {
      onAudioDelta(event.delta as string);
    } else if (type === 'input_audio_buffer.speech_started') {
      onClear();
    } else if (type === 'response.function_call_arguments.done') {
      const callId = event.call_id as string;
      const name = event.name as ToolName;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(event.arguments as string); } catch { /* empty args */ }

      log.info({ tool: name, args }, 'Tool call');
      let result: unknown;
      try {
        result = await executeTool(name, args, session);
      } catch (err) {
        result = { error: String(err) };
      }

      ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result),
        },
      }));
      ws.send(JSON.stringify({ type: 'response.create' }));
    } else if (type === 'error') {
      log.error({ event }, 'OpenAI Realtime error');
    }
  });

  ws.on('error', (err) => log.error({ err }, 'OpenAI WS error'));
  ws.on('close', () => log.info('OpenAI Realtime disconnected'));

  return {
    ws,
    sendAudio: (base64: string) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 }));
    },
    commitAudio: () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    },
    close: () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    },
  };
}
