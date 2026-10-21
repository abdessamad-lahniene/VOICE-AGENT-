import { type Session, type CartItem, cartTotal } from '../session/store.js';
import { lookupItemById } from './catalog.js';

export async function addToCart(
  session: Session,
  itemId: string,
  qty: number,
  notes?: string
): Promise<{ ok: boolean; message: string; cart: CartItem[]; total: number }> {
  const item = await lookupItemById(itemId);
  if (!item) return { ok: false, message: `Item ${itemId} not found.`, cart: session.cart, total: cartTotal(session.cart) };
  if (!item.available) return { ok: false, message: `${item.nameEn} is currently unavailable.`, cart: session.cart, total: cartTotal(session.cart) };

  const existing = session.cart.find((c) => c.itemId === itemId);
  if (existing) {
    existing.qty += qty;
    if (notes) existing.notes = notes;
  } else {
    session.cart.push({ itemId: item.id, nameEn: item.nameEn, nameAr: item.nameAr, price: item.price, qty, notes });
  }

  return { ok: true, message: `Added ${qty}x ${item.nameEn}.`, cart: session.cart, total: cartTotal(session.cart) };
}

export function removeFromCart(
  session: Session,
  itemId: string
): { ok: boolean; message: string; cart: CartItem[]; total: number } {
  const idx = session.cart.findIndex((c) => c.itemId === itemId);
  if (idx === -1) return { ok: false, message: 'Item not in cart.', cart: session.cart, total: cartTotal(session.cart) };
  const removed = session.cart.splice(idx, 1)[0];
  return { ok: true, message: `Removed ${removed.nameEn}.`, cart: session.cart, total: cartTotal(session.cart) };
}

export function showCart(session: Session): { cart: CartItem[]; total: number } {
  return { cart: session.cart, total: cartTotal(session.cart) };
}
