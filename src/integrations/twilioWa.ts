import twilio from 'twilio';
import { config } from '../config.js';
import type { CartItem } from '../session/store.js';
import { cartTotal } from '../session/store.js';

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

function formatCart(items: CartItem[], currency: string): string {
  const lines = items.map(
    (i) => `• ${i.nameEn} / ${i.nameAr}  x${i.qty}  = ${(i.price * i.qty).toFixed(2)} ${currency}`
  );
  lines.push(`\nTotal: ${cartTotal(items).toFixed(2)} ${currency}`);
  return lines.join('\n');
}

function canSendWa(): boolean {
  return !!(config.twilio.whatsappFrom && config.twilio.whatsappFrom !== 'whatsapp:');
}

export async function sendCustomerConfirmation(
  toPhone: string,
  customerName: string,
  items: CartItem[],
  address: string,
  orderId: string,
  currency = 'EGP'
): Promise<void> {
  const body =
    `✅ Order confirmed — شكراً ${customerName}!\n\n` +
    formatCart(items, currency) +
    `\n\n📍 Delivery to: ${address}` +
    `\n🔖 Order ID: ${orderId}` +
    `\n\nReply CONFIRM to confirm or EDIT to change your order.`;

  if (!canSendWa()) { console.log('[MOCK] Customer WA:', body); return; }
  await client.messages.create({
    from: config.twilio.whatsappFrom,
    to: `whatsapp:${toPhone}`,
    body,
  });
}

export async function sendOperatorAlert(
  customerName: string,
  customerPhone: string,
  items: CartItem[],
  address: string,
  orderId: string,
  notes: string,
  currency = 'EGP'
): Promise<void> {
  const body =
    `🔔 New Order #${orderId}\n\n` +
    `👤 ${customerName}  📞 ${customerPhone}\n\n` +
    formatCart(items, currency) +
    `\n\n📍 ${address}` +
    (notes ? `\n📝 ${notes}` : '');

  if (!canSendWa() || !config.operatorWhatsapp) { console.log('[MOCK] Operator WA:', body); return; }
  await client.messages.create({
    from: config.twilio.whatsappFrom,
    to: config.operatorWhatsapp,
    body,
  });
}
