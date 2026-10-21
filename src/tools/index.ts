import type { Session } from '../session/store.js';
import { listCategories, lookupItem } from './catalog.js';
import { addToCart, removeFromCart, showCart } from './cart.js';
import { finalizeOrder } from './finalize.js';

export type ToolName =
  | 'list_categories'
  | 'lookup_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'show_cart'
  | 'finalize_order';

export const toolDefinitions = [
  {
    type: 'function' as const,
    name: 'list_categories' as const,
    description: 'List available product/menu categories.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'lookup_item' as const,
    description: 'Look up an item by name (Arabic or English). Returns id, price, availability.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Item name in Arabic or English' } },
      required: ['query'],
    },
  },
  {
    type: 'function' as const,
    name: 'add_to_cart' as const,
    description: 'Add an item to the cart.',
    parameters: {
      type: 'object',
      properties: {
        item_id: { type: 'string' },
        qty: { type: 'integer', minimum: 1 },
        notes: { type: 'string', description: 'Optional special instructions' },
      },
      required: ['item_id', 'qty'],
    },
  },
  {
    type: 'function' as const,
    name: 'remove_from_cart' as const,
    description: 'Remove an item from the cart.',
    parameters: {
      type: 'object',
      properties: { item_id: { type: 'string' } },
      required: ['item_id'],
    },
  },
  {
    type: 'function' as const,
    name: 'show_cart' as const,
    description: 'Show current cart contents and total.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'finalize_order' as const,
    description: 'Place the order after confirming all details with the customer.',
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string' },
        phone: { type: 'string', description: 'Customer WhatsApp/delivery phone' },
        address: { type: 'string', description: 'Delivery address' },
        notes: { type: 'string', description: 'Any extra notes for the order' },
      },
      required: ['customer_name', 'phone', 'address'],
    },
  },
];

export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>,
  session: Session
): Promise<unknown> {
  switch (name) {
    case 'list_categories':
      return { categories: await listCategories() };

    case 'lookup_item': {
      const item = await lookupItem(String(args.query));
      if (!item) return { found: false };
      return { found: true, id: item.id, nameEn: item.nameEn, nameAr: item.nameAr, price: item.price, available: item.available };
    }

    case 'add_to_cart':
      return addToCart(session, String(args.item_id), Number(args.qty), args.notes as string | undefined);

    case 'remove_from_cart':
      return removeFromCart(session, String(args.item_id));

    case 'show_cart':
      return showCart(session);

    case 'finalize_order':
      return finalizeOrder(
        session,
        String(args.customer_name),
        String(args.phone),
        String(args.address),
        String(args.notes ?? '')
      );

    default:
      return { error: 'Unknown tool' };
  }
}
