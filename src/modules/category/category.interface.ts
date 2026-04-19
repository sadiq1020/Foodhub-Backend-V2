export interface ICreateCategory {
  name: string;
  slug?: string | undefined;
  image?: string | undefined;
}

export interface IUpdateCategory {
  name?: string | undefined;
  slug?: string | undefined;
  image?: string | undefined;
}
