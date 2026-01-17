import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          console.log(
            `[AUDIT] ${method} ${url} - User: ${user?.sub || 'anonymous'}`,
          );
        },
        error: (error) => {
          console.error(`[AUDIT] ${method} ${url} - Error: ${error.message}`);
        },
      }),
    );
  }
}
