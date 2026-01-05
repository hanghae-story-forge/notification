import { createStatusMessage } from '@/infrastructure/external/discord';
import type { AppContext } from '@/infrastructure/lib/router';
import * as HttpStatusCodes from 'stoker/http-status-codes';

// DDD Layer imports
import { GetCycleStatusQuery } from '@/application/queries';
import { DrizzleCycleRepository } from '@/infrastructure/persistence/drizzle/cycle.repository.impl';
import { DrizzleGenerationRepository } from '@/infrastructure/persistence/drizzle/generation.repository.impl';
import { DrizzleSubmissionRepository } from '@/infrastructure/persistence/drizzle/submission.repository.impl';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { NotFoundError } from '@/domain/common/errors';

// ========================================
// Repository & Query Instances
// ========================================

const cycleRepo = new DrizzleCycleRepository();
const generationRepo = new DrizzleGenerationRepository();
const submissionRepo = new DrizzleSubmissionRepository();
const memberRepo = new DrizzleMemberRepository();

const getCycleStatusQuery = new GetCycleStatusQuery(
  cycleRepo,
  generationRepo,
  submissionRepo,
  memberRepo
);

// ========================================
// Handlers
// ========================================

// 현재 진행중인 사이클 조회
export const getCurrentCycle = async (c: AppContext) => {
  try {
    const result = await getCycleStatusQuery.getCurrentCycle();

    if (!result) {
      return c.json(
        { error: 'No active cycle found' },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    console.error('Unexpected error in getCurrentCycle:', error);
    return c.json(
      { error: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// 현재 진행중인 사이클을 Discord 메시지 포맷으로 반환
export const getCurrentCycleDiscord = async (c: AppContext) => {
  try {
    // 현재 진행 중인 사이클 찾기
    const generation = await generationRepo.findActive();

    if (!generation) {
      return c.json(
        { error: 'No active cycle found' },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const cycles = await cycleRepo.findActiveCyclesByGeneration(
      generation.id.value
    );

    if (cycles.length === 0) {
      return c.json(
        { error: 'No active cycle found' },
        HttpStatusCodes.NOT_FOUND
      );
    }

    const cycle = cycles[0];
    const names = await getCycleStatusQuery.getCycleParticipantNames(
      cycle.id.value
    );

    if (!names) {
      return c.json(
        { error: 'Failed to get cycle participants' },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const discordMessage = createStatusMessage(
      names.cycleName,
      names.submittedNames,
      names.notSubmittedNames,
      names.endDate
    );

    return c.json(discordMessage, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, HttpStatusCodes.NOT_FOUND);
    }
    console.error('Unexpected error in getCurrentCycleDiscord:', error);
    return c.json(
      { error: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// 제출 현황 조회
export const getStatus = async (c: AppContext) => {
  const cycleId = parseInt(c.req.param('cycleId'));

  try {
    const result = await getCycleStatusQuery.getCycleStatus(cycleId);
    return c.json(result, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, HttpStatusCodes.NOT_FOUND);
    }
    console.error('Unexpected error in getStatus:', error);
    return c.json(
      { error: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

// 제출 현황을 Discord 메시지 포맷으로 반환
export const getStatusDiscord = async (c: AppContext) => {
  const cycleId = parseInt(c.req.param('cycleId'));

  try {
    const names = await getCycleStatusQuery.getCycleParticipantNames(cycleId);

    if (!names) {
      return c.json({ error: 'Cycle not found' }, HttpStatusCodes.NOT_FOUND);
    }

    const discordMessage = createStatusMessage(
      names.cycleName,
      names.submittedNames,
      names.notSubmittedNames,
      names.endDate
    );

    return c.json(discordMessage, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, HttpStatusCodes.NOT_FOUND);
    }
    console.error('Unexpected error in getStatusDiscord:', error);
    return c.json(
      { error: 'Internal server error' },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
