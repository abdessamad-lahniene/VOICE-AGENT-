import { google } from 'googleapis';
import { config } from '../config.js';

export interface CatalogItem {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string;
  price: number;
  available: boolean;
}

export interface OrderRow {
  callSid: string;
  customerName: string;
  phone: string;
  itemsJson: string;
  total: number;
  address: string;
  notes: string;
  status: string;
}

// Demo catalog used when Google Sheets credentials are not configured
const MOCK_CATALOG: CatalogItem[] = [
  { id: '1', nameEn: 'Margherita Pizza', nameAr: 'بيتزا مارغريتا', category: 'Pizza', price: 89, available: true },
  { id: '2', nameEn: 'Pepperoni Pizza', nameAr: 'بيتزا بيبروني', category: 'Pizza', price: 99, available: true },
  { id: '3', nameEn: 'Classic Burger', nameAr: 'برجر كلاسيك', category: 'Burgers', price: 65, available: true },
  { id: '4', nameEn: 'Cheese Burger', nameAr: 'تشيز برجر', category: 'Burgers', price: 75, available: true },
  { id: '5', nameEn: 'Grilled Chicken', nameAr: 'دجاج مشوي', category: 'Grills', price: 95, available: true },
  { id: '6', nameEn: 'French Fries', nameAr: 'بطاطس مقلية', category: 'Sides', price: 30, available: true },
  { id: '7', nameEn: 'Coleslaw', nameAr: 'سلطة كول سلو', category: 'Sides', price: 25, available: true },
  { id: '8', nameEn: 'Soft Drink', nameAr: 'مشروب غازي', category: 'Drinks', price: 20, available: true },
  { id: '9', nameEn: 'Water', nameAr: 'مياه', category: 'Drinks', price: 10, available: true },
];

function hasGoogleCreds(): boolean {
  return !!(config.google.serviceAccountEmail && config.google.privateKey && config.google.sheetId);
}

function makeSheets() {
  const auth = new google.auth.JWT({
    email: config.google.serviceAccountEmail,
    key: config.google.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

let catalogCache: CatalogItem[] = [];
let cacheTs = 0;

export async function getCatalog(): Promise<CatalogItem[]> {
  if (!hasGoogleCreds()) return MOCK_CATALOG;
  if (Date.now() - cacheTs < config.catalogCacheTtlMs) return catalogCache;

  const res = await makeSheets().spreadsheets.values.get({
    spreadsheetId: config.google.sheetId,
    range: 'Catalog!A2:F',
  });

  const rows = res.data.values ?? [];
  catalogCache = rows
    .filter((r) => r[0])
    .map((r) => ({
      id: String(r[0]),
      nameEn: String(r[1] ?? ''),
      nameAr: String(r[2] ?? ''),
      category: String(r[3] ?? ''),
      price: parseFloat(r[4] ?? '0'),
      available: String(r[5] ?? 'true').toLowerCase() !== 'false',
    }));

  cacheTs = Date.now();
  return catalogCache;
}

export async function appendOrder(order: OrderRow): Promise<void> {
  if (!hasGoogleCreds()) {
    console.log('[MOCK] Order would be written to Sheets:', order);
    return;
  }
  await makeSheets().spreadsheets.values.append({
    spreadsheetId: config.google.sheetId,
    range: 'Orders!A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        new Date().toISOString(),
        order.callSid,
        order.customerName,
        order.phone,
        order.itemsJson,
        order.total,
        order.address,
        order.notes,
        order.status,
      ]],
    },
  });
}
