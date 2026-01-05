import { createRouter } from '@/libs';
import * as routes from './status.routes';
import * as handlers from './status.handlers';

const router = createRouter()
  .openapi(routes.getStatus, handlers.getStatus)
  .openapi(routes.getStatusDiscord, handlers.getStatusDiscord);

export default router;
