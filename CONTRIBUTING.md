# 기여 가이드

똥글똥글 프로젝트에 관심을 가져주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 기여하기 전에

 Pull Request를 보내기 전에 다음을 확인해주세요:

- [ ] 이슈를 확인하고 작업할 내용을 결정했나요?
- [ ] 기존 코드 스타일을 따르고 있나요?
- [ ] 테스트를 통과했나요?
- [ ] 커밋 메시지를 명확하게 작성했나요?

## 개발 환경 설정

### 1. Fork 및 Clone

```bash
# 레포지토리 포크 후 클론
git clone https://github.com/YOUR_USERNAME/dongueldonguel.git
cd dongueldonguel
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 필요한 환경 변수를 설정합니다:

```env
DATABASE_URL=postgresql://localhost:5432/dongueldonguel
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
PORT=3000
```

### 4. 데이터베이스 설정

```bash
# 개발용 DB 스키마 적용
pnpm run db:push
```

### 5. 개발 서버 실행

```bash
pnpm run dev
```

## 개발 워크플로우

### 1. 브랜치 생성

```bash
git checkout -b feature/your-feature-name
# 또는
git checkout -b fix/bug-description
```

브랜치 네이밍 컨벤션:
- `feature/` - 새로운 기능 추가
- `fix/` - 버그 수정
- `docs/` - 문서 수정
- `refactor/` - 리팩토링
- `test/` - 테스트 추가/수정

### 2. 코드 작성 및 테스트

```bash
# 코드 포맷팅
pnpm run format

# 린팅
pnpm run lint
pnpm run lint:fix

# 빌드 테스트
pnpm run build
```

### 3. 커밋

커밋 메시지는 명확하고 간결하게 작성해주세요:

```
feat: GitHub Issue 댓글 파싱 로직 추가

- 첫 번째 http/https 링크 추출
- 중복 제출 방지 로직 추가
```

커밋 타입:
- `feat:` 새로운 기능
- `fix:` 버그 수정
- `docs:` 문서 변경
- `style:` 코드 포맷팅 (세미콜론, 들여쓰기 등)
- `refactor:` 리팩토링
- `test:` 테스트 추가/수정
- `chore:` 빌드 프로세스, 도구 변경

### 4. Pull Request 생성

```bash
git push origin feature/your-feature-name
```

GitHub에서 Pull Request를 생성하고 다음 내용을 포함해주세요:

- 변경 내용 요약
- 관련 이슈 번호 (Closes #issue 또는 Fixes #issue)
- 테스트 방법
- 스크린샷 (UI 변경이 있는 경우)

## 코드 스타일

### TypeScript

- 세미콜론 사용 필수
- 싱글 쿼트 사용
- 2 스페이스 들여쓰기
- 사용하지 않는 변수는 `_` 접두사 사용

```typescript
// Good
const fetchData = async (): Promise<void> => {
  const _unused = 'unused';
  const result = await api.get();
  return result;
};

// Bad
const fetchData = async () => {
    const unused = "unused"
    const result = await api.get()
    return result
}
```

### API 라우트 구조

```typescript
// src/routes/your-route.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/api/endpoint', async (c) => {
  // 구현
});

export default app;
```

### 데이터베이스 스키마 변경

```bash
# 1. schema.ts 수정
# 2. 마이그레이션 생성
pnpm run db:generate

# 3. 로컬에서 테스트
pnpm run db:push

# 4. 마이그레이션 파일 확인
```

## 테스트

### 수동 테스트 체크리스트

- [ ] 개발 서버가 정상적으로 시작되나요?
- [ ] API 엔드포인트가 예상대로 동작하나요?
- [ ] 데이터베이스 쿼리가 올바르게 실행되나요?
- [ ] Discord 웹훅이 정상적으로 전송되나요?
- [ ] GitHub 웹훅 이벤트가 올바르게 처리되나요?

## Pull Request 검토 기준

PR이 머지되기 위해 다음 기준을 충족해야 합니다:

1. **코드 품질**: ESLint 및 Prettier를 통과
2. **빌드 성공**: `pnpm run build` 실패 없이 완료
3. **테스트**: 모든 테스트 통과
4. **문서**: 새로운 기능에 대한 문서 추가
5. **커밋 메시지**: 명확하고 의미 있는 커밋 메시지

## 문서화

코드 변경과 함께 문서 업데이트가 필요한 경우:

- **API 변경**: README.md의 API 명석 섹션 업데이트
- **스키마 변경**: README.md의 DB 스키마 섹션 업데이트
- **새로운 기능**: CLAUDE.md에 프로젝트 관련 추가 정보 업데이트

## 이슈 보고

버그를 발견하거나 기능을 요청하려면:

1. [Issues](https://github.com/hanghae-story-forge/dongueldonguel/issues) 페이지로 이동
2. "New Issue" 클릭
3. 템플릿에 맞춰 내용 작성
   - 버그 보고: 재현 단계, 기대 동작, 실제 동작, 환경 정보
   - 기능 요청: 사용 사례, 제안하는 해결책

## 라이선스

기여하신 모든 코드는 프로젝트의 라이선스에 따라 배포됩니다.

## 질문?

궁금한 점이 있으면 [Issues](https://github.com/hanghae-story-forge/dongueldonguel/issues)에서 질문해주세요.
