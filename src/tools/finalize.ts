import { type Session, cartTotal } from '../session/store.js';
import { appendOrder } from '../integrations/sheets.js';
import { sendCustomerConfirmation, sendOperatorAlert } from '../integrations/twilioWa.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const businessConfig = JSON.parse(
  readFileSync(resolve(__dir, '../../config/business.json'), 'utf-8')
) as { currency: string };

export async function finalizeOrder(
  session: Session,
  customerName: string,
  phone: string,
  address: string,
  notes = ''
): Promise<{ ok: boolean; orderId?: string; message: string }> {
  if (session.cart.length === 0) {
    return { ok: false, message: 'Cart is empty — cannot finalize.' };
  }

  session.customerName = customerName;
  session.deliveryPhone = phone;
  session.address = address;
  session.finalized = true;

  const orderId = `ORD-${Date.now()}`;
  const total = cartTotal(session.cart);
  const currency = businessConfig.currency;

  await appendOrder({
    callSid: session.callSid,
    customerName,
    phone,
    itemsJson: JSON.stringify(session.cart),
    total,
    address,
    notes,
    status: 'pending',
  });

  await Promise.all([
    sendCustomerConfirmation(phone, customerName, session.cart, address, orderId, currency),
    sendOperatorAlert(customerName, phone, session.cart, address, orderId, notes, currency),
  ]);

  return { ok: true, orderId, message: `Order ${orderId} placed. Total: ${total.toFixed(2)} ${currency}.` };
}
