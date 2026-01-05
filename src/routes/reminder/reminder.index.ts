import { createRouter } from '@/libs';
import * as routes from './reminder.routes';
import * as handlers from './reminder.handlers';

const router = createRouter()
  .openapi(routes.getReminderCycles, handlers.getReminderCycles)
  .openapi(routes.getNotSubmittedMembers, handlers.getNotSubmittedMembers)
  .openapi(
    routes.sendReminderNotifications,
    handlers.sendReminderNotifications
  );

export default router;
