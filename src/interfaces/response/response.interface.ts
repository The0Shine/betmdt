/**
 * Base Response Interfaces matching utils/general.ts jsonOne and jsonAll
 */

export interface IResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface IPaginationMeta {
  count: number;
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IListResponse<T> {
  success: boolean;
  data: T[];
  meta?: IPaginationMeta;
}

export interface IMessageResponse {
  message: string;
}
