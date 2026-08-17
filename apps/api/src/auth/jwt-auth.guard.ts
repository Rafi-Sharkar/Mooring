import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AdminRequest } from './admin.decorator';

const COOKIE_NAME = 'dockhand_session';

/**
 * Reads the session cookie, verifies the JWT, and attaches the admin payload
 * to `req.admin`. Throws 401 if the cookie is missing or invalid.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AdminRequest>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }
    const payload = this.authService.verifyAdminToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    req.admin = payload;
    return true;
  }

  private extractToken(req: Request): string | null {
    // Prefer HttpOnly cookie; fall back to Authorization header for API clients.
    const cookieToken =
      (req as any).cookies?.[COOKIE_NAME] ||
      this.parseCookieHeader(req.headers.cookie, COOKIE_NAME);
    if (cookieToken) return cookieToken;

    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.substring('Bearer '.length).trim();
    }
    return null;
  }

  private parseCookieHeader(
    header: string | undefined,
    name: string,
  ): string | null {
    if (!header) return null;
    const parts = header.split(';');
    for (const part of parts) {
      const [k, ...rest] = part.trim().split('=');
      if (k === name) return decodeURIComponent(rest.join('='));
    }
    return null;
  }
}