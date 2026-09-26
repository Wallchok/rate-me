// Shape of GET /api/sync, cached on the device for offline use
export interface Person {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Rating {
  personId: number;
  score: number;
  note: string | null;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string | null;
  ean: string | null;
  categoryId: number;
  imageUrl: string | null;
  nutriScore: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  sugar: number | null;
  fat: number | null;
  createdAt: string;
  ratings: Rating[];
  // People who chose not to rate it
  skippedBy: number[];
}

export interface ListItem {
  id: string;
  text: string;
  productId: number | null;
  addedById: number;
  boughtById: number | null;
  boughtAt: string | null;
  createdAt: string;
}

export interface SyncData {
  meId: number;
  persons: Person[];
  categories: Category[];
  products: Product[];
  list: ListItem[];
  syncedAt: string;
}

// GET /api/off/search result row (Open Food Facts)
export interface OffSearchHit {
  ean: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  thumbUrl: string | null;
}
