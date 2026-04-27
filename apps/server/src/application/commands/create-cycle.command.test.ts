import { describe, expect, it, vi } from 'vitest';

import { CreateCycleCommand } from './create-cycle.command';
import { Cycle } from '../../domain/cycle/cycle.domain';
import type { CycleRepository } from '../../domain/cycle/cycle.repository';
import {
  Generation,
  GenerationId,
} from '../../domain/generation/generation.domain';
import type { GenerationRepository } from '../../domain/generation/generation.repository';
import { Organization } from '../../domain/organization/organization.domain';
import type { OrganizationRepository } from '../../domain/organization/organization.repository';

function makeOrganization() {
  return Organization.reconstitute({
    id: 2,
    name: '똥글똥글',
    slug: 'donguel-donguel',
    discordWebhookUrl: null,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function makeGeneration(id: number, name: string) {
  return Generation.reconstitute({
    id,
    organizationId: 2,
    name,
    startedAt: new Date('2026-01-04T15:56:53.811Z'),
    isActive: true,
    createdAt: new Date(`2026-01-0${id}T00:00:00.000Z`),
  });
}

describe('CreateCycleCommand', () => {
  it('creates a cycle on the explicitly requested active generation instead of the first active generation', async () => {
    const firstActiveGeneration = makeGeneration(2, '똥글똥글 1기');
    const requestedGeneration = makeGeneration(1, '똥글똥글 2기');

    const organizationRepo = {
      findBySlug: vi.fn().mockResolvedValue(makeOrganization()),
    } as unknown as OrganizationRepository;

    const generationRepo = {
      findActiveByOrganization: vi
        .fn()
        .mockResolvedValue(firstActiveGeneration),
      findById: vi.fn().mockResolvedValue(requestedGeneration),
    } as unknown as GenerationRepository;

    const cycleRepo = {
      findByGenerationAndWeek: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as CycleRepository;

    const command = new CreateCycleCommand(
      cycleRepo,
      generationRepo,
      organizationRepo
    );

    const result = await command.execute({
      organizationSlug: 'donguel-donguel',
      generationId: 1,
      week: 7,
      startDate: new Date('2026-04-26T15:00:00.000Z'),
      endDate: new Date('2026-05-10T14:59:59.000Z'),
      githubIssueUrl:
        'https://github.com/hanghae-story-forge/archive/issues/16',
    });

    expect(generationRepo.findById).toHaveBeenCalledWith(
      GenerationId.create(1)
    );
    expect(generationRepo.findActiveByOrganization).not.toHaveBeenCalled();
    expect(cycleRepo.findByGenerationAndWeek).toHaveBeenCalledWith(1, 7);
    expect(cycleRepo.save).toHaveBeenCalledOnce();
    const savedCycle = vi.mocked(cycleRepo.save).mock.calls[0][0] as Cycle;
    expect(savedCycle.generationId).toBe(1);
    expect(savedCycle.week.toNumber()).toBe(7);
    expect(result.generationName).toBe('똥글똥글 2기');
  });
});
