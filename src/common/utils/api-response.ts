import {
  ApiMeta,
  ApiResponse,
} from '../../shared/interfaces/api-response.interface';

/**
 * Builds the standard response envelope `{ status, message, data, meta }`.
 * Call it directly in controllers so each route shapes its own response.
 */
export function apiResponse<T>(
  data: T,
  message = 'Processed successfully',
  status = 200,
): ApiResponse<T> {
  return {
    status,
    message,
    data,
    meta: null,
  };
}

export function paginatedResponse<T>(
  data: T,
  meta: ApiMeta,
  message = 'Records retrieved successfully',
  status = 200,
): ApiResponse<T> {
  return {
    status,
    message,
    data,
    meta,
  };
}
