import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

const metaSchema = {
  type: 'object',
  nullable: true,
  properties: {
    page: { type: 'number', nullable: true },
    limit: { type: 'number', nullable: true },
    total: { type: 'number', nullable: true },
    totalPages: { type: 'number', nullable: true },
  },
};

/**
 * Documents a successful response in the standard envelope,
 * consistent with `apiResponse()`:
 * `{ status, message, data, meta }`.
 *
 * @example
 * @Get()
 * @ApiEnvelopeOkResponse(UserEntity, { isArray: true })
 * findAll() { ... }
 */
export function ApiEnvelopeOkResponse<T extends Type<unknown>>(
  type: T,
  options: {
    description?: string;
    isArray?: boolean;
    status?: number;
  } = {},
): MethodDecorator {
  const { description = 'OK', isArray = false, status = 200 } = options;

  return applyDecorators(
    ApiExtraModels(type),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          status: { type: 'number', example: status },
          message: { type: 'string', example: 'Processed successfully' },
          data: isArray
            ? {
                type: 'array',
                nullable: true,
                items: { $ref: getSchemaPath(type) },
              }
            : { nullable: true, allOf: [{ $ref: getSchemaPath(type) }] },
          meta: metaSchema,
        },
        required: ['status', 'message', 'data', 'meta'],
      },
    }),
  );
}

/**
 * Documents an error response in the standard envelope:
 * `{ status, message, data: null, meta: null }`.
 *
 * @example
 * @Get(':id')
 * @ApiEnvelopeExceptionResponse(404, 'User not found')
 */
export function ApiEnvelopeExceptionResponse(
  status: number,
  description = 'Error',
): MethodDecorator {
  return ApiResponse({
    status,
    description,
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: status },
        message: { type: 'string', example: description },
        data: { type: 'null' },
        meta: { type: 'null' },
      },
      required: ['status', 'message', 'data', 'meta'],
    },
  });
}
