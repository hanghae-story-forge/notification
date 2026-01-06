# Auth Domain

- **Scope**: apps/server
- **Layer**: domain
- **Source of Truth**: apps/server/src/domain/auth/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## JWTToken Value Object

- **Location**: `apps/server/src/domain/auth/jwt.vo.ts` (L5-L30)
- **Type**: Value Object
- **Purpose**: JWT 토큰의 유효성을 검사하고 캡슐화
- **Validation**:
  - JWT 형식: `header.payload.signature`
  - 정규식: `/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/`
- **Evidence**:
  ```typescript
  export class JWTToken {
    private constructor(public readonly value: string) {
      const jwtRegex = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;
      if (!jwtRegex.test(value)) {
        throw new InvalidValueError('JWT Token', value, 'Invalid JWT token format');
      }
    }

    static create(value: string): JWTToken {
      return new JWTToken(value);
    }
  }
  ```

## JWTPayload Interface

- **Location**: `apps/server/src/domain/auth/jwt.vo.ts` (L32-L44)
- **Purpose**: JWT 토큰의 페이로드 구조 정의
- **Properties**:
  - `sub: string` - Member ID (subject)
  - `discordId: string` - Discord User ID
  - `iat?: number` - Issued At (발행 시간)
  - `exp?: number` - Expiration Time (만료 시간)
  - `iss: string` - Issuer (발행자)
  - `aud: string` - Audience (대상)
- **Evidence**:
  ```typescript
  export interface JWTPayload {
    sub: string; // Member ID (subject)
    discordId: string; // Discord User ID
    iat?: number; // Issued At
    exp?: number; // Expiration Time
  }

  export interface JWTClaims extends JWTPayload {
    iss: string; // Issuer
    aud: string; // Audience
  }
  ```

## JWTService Interface

- **Location**: `apps/server/src/domain/auth/jwt.service.ts`
- **Purpose**: JWT 토큰 생성 및 검증 인터페이스
- **Methods**:
  - `generateToken(memberId: MemberId, discordId: DiscordId): Promise<JWTToken>` - JWT 토큰 생성
  - `verifyToken(token: JWTToken): Promise<JWTClaims>` - JWT 토큰 검증 및 클레임 반환
  - `refreshToken(token: JWTToken): Promise<JWTToken>` - JWT 토큰 갱신

## JWTServiceImpl (Infrastructure)

- **Location**: `apps/server/src/infrastructure/jwt/jwt.service.impl.ts`
- **Type**: Infrastructure Implementation
- **Purpose**: JWTService 인터페이스의 실제 구현체
- **Dependencies**:
  - `jwt` 라이브러리 (jsonwebtoken)
  - 환경 변수: `JWT_SECRET`, `JWT_EXPIRES_IN`
- **Implementation Details**:
  - HS256 알고리즘 사용
  - Discord ID를 기반으로 한 인증
  - Member ID를 subject로 사용
