import { createRouter } from '@/lib/router';
import * as routes from './status.routes';
import * as handlers from './status.handlers';

const router = createRouter()
  .openapi(routes.getCurrentCycle, handlers.getCurrentCycle)
  .openapi(routes.getCurrentCycleDiscord, handlers.getCurrentCycleDiscord)
  .openapi(routes.getStatus, handlers.getStatus)
  .openapi(routes.getStatusDiscord, handlers.getStatusDiscord);

export default router;
