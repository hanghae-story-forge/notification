import { createRouter } from '@/libs';
import * as routes from './github.routes';
import * as handlers from './github.handlers';

const router = createRouter();

// GitHub 웹훅 메인 핸들러 - 이벤트 타입에 따라 분기
router.openapi(routes.handleIssueComment, handlers.handleIssueComment);
router.openapi(routes.handleIssues, handlers.handleIssues);
router.openapi(routes.handleUnknownEvent, handlers.handleUnknownEvent);

export default router;
