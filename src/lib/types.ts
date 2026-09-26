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
}

export interface SyncData {
  meId: number;
  persons: Person[];
  categories: Category[];
  products: Product[];
  syncedAt: string;
}
