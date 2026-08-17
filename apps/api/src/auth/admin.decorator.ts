import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AdminJwtPayload } from './auth.service';

export interface AdminRequest extends Request {
  admin?: AdminJwtPayload;
}

/**
 * Parameter decorator that extracts the authenticated admin from the request.
 * Use in controllers after JwtAuthGuard has populated `req.admin`.
 */
export const Admin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminJwtPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<AdminRequest>();
    return req.admin;
  },
);