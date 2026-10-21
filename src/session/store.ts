export interface CartItem {
  itemId: string;
  nameEn: string;
  nameAr: string;
  price: number;
  qty: number;
  notes?: string;
}

export interface Session {
  callSid: string;
  callerPhone: string;
  language: 'ar' | 'en' | 'unknown';
  customerName?: string;
  deliveryPhone?: string;
  address?: string;
  cart: CartItem[];
  finalized: boolean;
}

const sessions = new Map<string, Session>();

export function createSession(callSid: string, callerPhone: string): Session {
  const s: Session = {
    callSid,
    callerPhone,
    language: 'unknown',
    cart: [],
    finalized: false,
  };
  sessions.set(callSid, s);
  return s;
}

export function getSession(callSid: string): Session | undefined {
  return sessions.get(callSid);
}

export function deleteSession(callSid: string): void {
  sessions.delete(callSid);
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}
