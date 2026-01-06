// JWT Service Implementation using jose library

import { JWTService, JWTServiceConfig } from '../../domain/auth/jwt.service';
import { JWTToken, JWTPayload } from '../../domain/auth/jwt.vo';
import { SignJWT, jwtVerify } from 'jose';

export class JoseJWTService implements JWTService {
  private readonly secretKey: Uint8Array;

  constructor(private readonly config: JWTServiceConfig) {
    this.secretKey = new TextEncoder().encode(config.secret);
  }

  async generateToken(payload: JWTPayload): Promise<JWTToken> {
    const now = Math.floor(Date.now() / 1000);

    const claims: JWTClaims = {
      ...payload,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: payload.iat ?? now,
      exp: payload.exp ?? this.getExpirationTime(now),
    };

    const token = await new SignJWT({ ...claims })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(claims.iat ?? now)
      .setExpirationTime(claims.exp ?? this.getExpirationTime(now))
      .setIssuer(claims.iss)
      .setAudience(claims.aud)
      .setSubject(claims.sub)
      .sign(this.secretKey);

    return JWTToken.create(token);
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      });

      return {
        sub: payload.sub ?? '',
        discordId: (payload.discordId as string) ?? '',
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch (error) {
      throw new Error(
        `Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async refreshToken(token: string): Promise<JWTToken> {
    const payload = await this.verifyToken(token);
    return this.generateToken({
      sub: payload.sub,
      discordId: payload.discordId,
    });
  }

  private getExpirationTime(now: number): number {
    const expiresIn = this.config.expiresIn;
    const match = expiresIn.match(/^(\d+)([dhms])$/);

    if (!match) {
      throw new Error(`Invalid expiresIn format: ${expiresIn}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      d: 86400, // days
      h: 3600, // hours
      m: 60, // minutes
      s: 1, // seconds
    };

    return now + value * multipliers[unit];
  }
}

interface JWTClaims extends JWTPayload {
  iss: string;
  aud: string;
}
