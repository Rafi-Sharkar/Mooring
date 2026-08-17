import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminJwtPayload {
  sub: string; // admin id
  username: string;
  type: 'admin';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a cryptographically secure random token (64 bytes, hex-encoded).
   * Returns the plaintext token — this is shown to the user ONCE and never stored.
   */
  generateToken(): string {
    return randomBytes(64).toString('hex');
  }

  /**
   * Hash a token using argon2id for secure storage.
   */
  async hashToken(token: string): Promise<string> {
    return argon2.hash(token, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verify a plaintext token against a stored hash.
   */
  async verifyToken(token: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, token);
    } catch {
      return false;
    }
  }

  /**
   * Validate SuperAdmin credentials. Returns the admin (without passwordHash) or throws.
   */
  async validateAdmin(username: string, password: string) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { username },
    });

    if (!admin) {
      // Constant-ish time: still run a dummy argon2 verify to avoid leaking which
      // part of the credential was wrong via timing.
      await argon2.hash('dummy-prevent-timing-leak', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(admin.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: admin.id,
      username: admin.username,
    };
  }

  /**
   * Sign a JWT for an authenticated admin.
   */
  signAdminToken(admin: { id: string; username: string }): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const payload: AdminJwtPayload = {
      sub: admin.id,
      username: admin.username,
      type: 'admin',
    };
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Verify a JWT and return its payload, or null if invalid.
   */
  verifyAdminToken(token: string): AdminJwtPayload | null {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    try {
      const decoded = jwt.verify(token, secret) as AdminJwtPayload;
      if (decoded.type !== 'admin') return null;
      return decoded;
    } catch {
      return null;
    }
  }
}