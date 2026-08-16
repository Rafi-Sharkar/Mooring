import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
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
}
