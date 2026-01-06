// JWT Service - JWT 토큰 생성 및 검증

import { JWTToken, JWTPayload } from './jwt.vo';

export interface JWTServiceConfig {
  secret: string; // JWT 서명 시크릿
  expiresIn: string; // 토큰 만료 기간 (예: '7d', '24h')
  issuer: string; // 발급자 (예: 'dongueldonguel')
  audience: string; // 대상 (예: 'dongueldonguel-api')
}

export interface JWTService {
  // 토큰 생성
  generateToken(payload: JWTPayload): Promise<JWTToken>;

  // 토큰 검증
  verifyToken(token: string): Promise<JWTPayload>;

  // 토큰 갱신
  refreshToken(token: string): Promise<JWTToken>;
}
