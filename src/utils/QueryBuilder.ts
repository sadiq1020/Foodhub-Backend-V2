// The shape of pagination metadata returned with every list response
export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// The shape of every paginated response
export interface IPaginatedResult<T> {
  data: T[];
  meta: IPaginationMeta;
}

// Query params the client can send for any list endpoint
export interface IQueryParams {
  page?: string | undefined;
  limit?: string | undefined;
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
  search?: string | undefined;
  [key: string]: any;
}

// Config you pass when creating a QueryBuilder
export interface IQueryBuilderConfig {
  // Fields to search across when ?search=xxx is provided
  searchableFields?: string[];
  // Fields allowed as filters (?role=CUSTOMER, ?isActive=true etc)
  filterableFields?: string[];
  // Default field to sort by
  defaultSortBy?: string;
  // Default sort direction
  defaultSortOrder?: "asc" | "desc";
  // Default page size
  defaultLimit?: number;
}

export class QueryBuilder<T> {
  private model: any;
  private params: IQueryParams;
  private config: IQueryBuilderConfig;

  // These build up as you chain methods
  private whereClause: Record<string, any> = {};
  private orderByClause: Record<string, any> = {};
  private skipValue: number = 0;
  private takeValue: number = 10;
  private page: number = 1;
  private limit: number = 10;

  constructor(
    model: any,
    params: IQueryParams,
    config: IQueryBuilderConfig = {},
  ) {
    this.model = model;
    this.params = params;
    this.config = config;
  }

  // Adds OR search conditions across searchable fields
  search(): this {
    const { search } = this.params;
    const { searchableFields } = this.config;

    if (search && searchableFields && searchableFields.length > 0) {
      this.whereClause.OR = searchableFields.map((field) => ({
        [field]: { contains: search, mode: "insensitive" },
      }));
    }

    return this;
  }

  // Adds equality filters for allowed fields
  filter(): this {
    const { filterableFields } = this.config;
    const excludedKeys = ["page", "limit", "sortBy", "sortOrder", "search"];

    if (!filterableFields || filterableFields.length === 0) {
      return this;
    }

    for (const key of filterableFields) {
      const value = this.params[key];

      if (value === undefined || value === null || value === "") {
        continue;
      }

      // Convert "true"/"false" strings to booleans
      if (value === "true") {
        this.whereClause[key] = true;
      } else if (value === "false") {
        this.whereClause[key] = false;
      } else if (!isNaN(Number(value)) && value !== "") {
        // Convert numeric strings to numbers for range filters
        this.whereClause[key] = Number(value);
      } else {
        this.whereClause[key] = value;
      }
    }

    return this;
  }

  // Calculates skip/take from page and limit params
  paginate(): this {
    const rawPage = parseInt(this.params.page || "1");
    const rawLimit = parseInt(
      this.params.limit || String(this.config.defaultLimit || 10),
    );

    // Clamp values to sensible ranges
    this.page = rawPage > 0 ? rawPage : 1;
    this.limit = rawLimit > 0 && rawLimit <= 100 ? rawLimit : 10;
    this.skipValue = (this.page - 1) * this.limit;
    this.takeValue = this.limit;

    return this;
  }

  // Sets orderBy from sortBy and sortOrder params
  sort(): this {
    const sortBy =
      this.params.sortBy || this.config.defaultSortBy || "createdAt";
    const sortOrder =
      this.params.sortOrder === "asc"
        ? "asc"
        : this.params.sortOrder === "desc"
          ? "desc"
          : this.config.defaultSortOrder || "desc";

    this.orderByClause = { [sortBy]: sortOrder };

    return this;
  }

  // Merges extra where conditions (e.g. for ownership checks)
  where(conditions: Record<string, any>): this {
    this.whereClause = { ...this.whereClause, ...conditions };
    return this;
  }

  // Runs the query and returns paginated result
  async execute(
    includeClause?: Record<string, any>,
  ): Promise<IPaginatedResult<T>> {
    const [total, data] = await Promise.all([
      this.model.count({ where: this.whereClause }),
      this.model.findMany({
        where: this.whereClause,
        orderBy: this.orderByClause,
        skip: this.skipValue,
        take: this.takeValue,
        ...(includeClause && { include: includeClause }),
      }),
    ]);

    const totalPages = Math.ceil(total / this.limit);

    return {
      data,
      meta: {
        page: this.page,
        limit: this.limit,
        total,
        totalPages,
      },
    };
  }
}
