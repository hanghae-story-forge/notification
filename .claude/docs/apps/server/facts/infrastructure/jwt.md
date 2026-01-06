# JWT Infrastructure

- **Scope**: apps/server
- **Layer**: infrastructure
- **Source of Truth**: apps/server/src/infrastructure/jwt/
- **Last Verified**: 2025-01-07
- **Repo Ref**: 82509c3

## JWT Service Implementation

- **Location**: `apps/server/src/infrastructure/jwt/jwt.service.impl.ts`
- **Purpose**: JWTService 인터페이스의 실제 구현체
- **Library**: jsonwebtoken
- **Algorithm**: HS256
- **Environment Variables**:
  - `JWT_SECRET` - 서명 키 (필수)
  - `JWT_EXPIRES_IN` - 만료 시간 (기본값: "7d")
- **Methods**:
  - `generateToken(memberId, discordId)` - JWT 토큰 생성
  - `verifyToken(token)` - JWT 토큰 검증 및 클레임 반환
  - `refreshToken(token)` - JWT 토큰 갱신
- **Payload**:
  - `sub` - Member ID
  - `discordId` - Discord User ID
  - `iat` - Issued At
  - `exp` - Expiration Time
  - `iss` - Issuer
  - `aud` - Audience
