export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T | null;
  meta: ApiMeta | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: ApiMeta;
}
