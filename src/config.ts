import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string): string {
  return process.env[name] ?? '';
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:3000',

  twilio: {
    accountSid: required('TWILIO_ACCOUNT_SID'),
    authToken: required('TWILIO_AUTH_TOKEN'),
    phoneNumber: optional('TWILIO_PHONE_NUMBER'),
    whatsappFrom: optional('TWILIO_WHATSAPP_FROM'),
  },

  openai: {
    apiKey: required('OPENAI_API_KEY'),
    model: 'gpt-4o-realtime-preview-2024-12-17',
  },

  google: {
    serviceAccountEmail: optional('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    privateKey: optional('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    sheetId: optional('GOOGLE_SHEET_ID'),
  },

  operatorWhatsapp: optional('OPERATOR_WHATSAPP'),

  catalogCacheTtlMs: 60_000,
};
