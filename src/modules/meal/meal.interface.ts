export interface IMealFilters {
  categoryId?: string | undefined;
  dietary?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  search?: string | undefined;
  providerId?: string | undefined;
  page?: string | undefined;
  limit?: string | undefined;
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export interface ICreateMeal {
  name: string;
  description?: string | undefined;
  price: number;
  image?: string | undefined;
  categoryId: string;
  providerId: string;
  dietary?: string[] | undefined;
}

export interface IUpdateMeal {
  name?: string | undefined;
  description?: string | undefined;
  price?: number | undefined;
  image?: string | undefined;
  isAvailable?: boolean | undefined;
  categoryId?: string | undefined;
  dietary?: string[] | undefined;
}
