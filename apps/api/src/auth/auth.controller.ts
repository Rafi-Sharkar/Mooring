import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Admin, type AdminRequest } from './admin.decorator';

const COOKIE_NAME = 'dockhand_session';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Body: { username, password }
   * Sets HttpOnly session cookie on success.
   */
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const admin = await this.authService.validateAdmin(
      dto.username,
      dto.password,
    );
    const token = this.authService.signAdminToken(admin);
    setSessionCookie(res, token);
    return {
      success: true,
      admin: { id: admin.id, username: admin.username },
    };
  }

  /**
   * POST /api/auth/logout
   * Clears the session cookie.
   */
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearSessionCookie(res);
    return { success: true };
  }

  /**
   * GET /api/auth/me
   * Returns the currently authenticated admin (requires valid cookie/JWT).
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Admin() admin: AdminRequest['admin']) {
    return { admin };
  }
}