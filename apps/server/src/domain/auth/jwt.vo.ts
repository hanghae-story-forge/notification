// JWT Value Objects

import { InvalidValueError } from '../common/errors';

// JWT Token Value Object
export class JWTToken {
  private constructor(public readonly value: string) {
    // Basic JWT format: header.payload.signature
    const jwtRegex = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;
    if (!jwtRegex.test(value)) {
      throw new InvalidValueError('JWT Token', value, 'Invalid JWT token format');
    }
  }

  static create(value: string): JWTToken {
    return new JWTToken(value);
  }

  equals(other: JWTToken): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// JWT Payload Value Object
export interface JWTPayload {
  sub: string; // Member ID (subject)
  discordId: string; // Discord User ID
  iat?: number; // Issued At
  exp?: number; // Expiration Time
}

// JWT Claims
export interface JWTClaims extends JWTPayload {
  iss: string; // Issuer
  aud: string; // Audience
}
