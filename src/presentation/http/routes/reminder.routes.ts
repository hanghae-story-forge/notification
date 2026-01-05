import { Hono } from 'hono';
import type { Env } from '../../../libs';
import { ReminderController } from '../controllers/reminder.controller';

export const createReminderRoutes = (controller: ReminderController) => {
  const app = new Hono<Env>();

  // n8n용 리마인더 대상 사이클 목록 조회
  app.get('/api/reminder', async (c) => controller.getReminderCycles(c));

  // 특정 사이클의 미제출자 목록 조회
  app.get('/api/reminder/:cycleId/not-submitted', async (c) =>
    controller.getNotSubmittedMembers(c)
  );

  // 리마인더 알림 발송 (GitHub Actions용)
  app.post('/api/reminder/send', async (c) =>
    controller.sendReminderNotifications(c)
  );

  return app;
};
