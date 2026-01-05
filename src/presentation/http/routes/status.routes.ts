import { Hono } from 'hono';
import type { Env } from '@/libs';
import { StatusController } from '../controllers/status.controller';

export const createStatusRoutes = (controller: StatusController) => {
  const app = new Hono<Env>();

  // 제출 현황 조회 (Discord Bot용)
  app.get('/api/status/:cycleId', async (c) => controller.getStatus(c));

  // 제출 현황을 Discord 메시지 포맷으로 반환
  app.get('/api/status/:cycleId/discord', async (c) =>
    controller.getStatusDiscord(c)
  );

  return app;
};
