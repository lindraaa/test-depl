import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE = 'RESPONSE_MESSAGE';

/**
 * Overrides the default success message produced by the TransformInterceptor.
 *
 * @example
 * @Get()
 * @ResponseMessage('Users listed successfully')
 * findAll() { ... }
 */
export const ResponseMessage = (message: string): MethodDecorator =>
  SetMetadata(RESPONSE_MESSAGE, message);
