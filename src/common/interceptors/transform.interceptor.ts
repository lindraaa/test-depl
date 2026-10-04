import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { RESPONSE_MESSAGE } from '../decorators/response-message.decorator';

const ACTION_WORDS: Record<string, string> = {
  GET: 'retrieved',
  POST: 'created',
  PATCH: 'updated',
  PUT: 'updated',
  DELETE: 'deleted',
};

function fallbackMessage(method: string, isCollection: boolean): string {
  const action = ACTION_WORDS[method] ?? 'processed';
  const subject = isCollection ? 'Records' : 'Record';
  return `${subject} ${action} successfully`;
}

/**
 * Wraps every successful response in the standard envelope:
 * `{ status, message, data, meta }`.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        const customMessage = this.reflector.get<string | undefined>(
          RESPONSE_MESSAGE,
          context.getHandler(),
        );

        const isCollection = Array.isArray(data);

        return {
          status: 200,
          message:
            customMessage ?? fallbackMessage(request.method, isCollection),
          data,
          meta: null,
        };
      }),
    );
  }
}
