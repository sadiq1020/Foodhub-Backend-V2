export interface ICreateReview {
  mealId: string;
  customerId: string;
  rating: number;
  comment?: string | undefined;
}

export interface IUpdateReview {
  rating?: number | undefined;
  comment?: string | undefined;
}
