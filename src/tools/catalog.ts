import Fuse from 'fuse.js';
import { getCatalog, type CatalogItem } from '../integrations/sheets.js';

export async function listCategories(): Promise<string[]> {
  const items = await getCatalog();
  return [...new Set(items.filter((i) => i.available).map((i) => i.category))];
}

export async function lookupItem(query: string): Promise<CatalogItem | null> {
  const items = (await getCatalog()).filter((i) => i.available);
  const fuse = new Fuse(items, {
    keys: ['nameEn', 'nameAr'],
    threshold: 0.4,
    includeScore: true,
  });
  const results = fuse.search(query);
  return results[0]?.item ?? null;
}

export async function lookupItemById(id: string): Promise<CatalogItem | null> {
  const items = await getCatalog();
  return items.find((i) => i.id === id) ?? null;
}
