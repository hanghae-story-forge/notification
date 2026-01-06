// Cycle Repository Interface

import { CycleId, Cycle } from './cycle.domain';

export interface CycleRepository {
  /**
   * 사이클 저장 (생성 또는 업데이트)
   */
  save(cycle: Cycle): Promise<void>;

  /**
   * ID로 사이클 조회
   */
  findById(id: CycleId): Promise<Cycle | null>;

  /**
   * GitHub Issue URL로 사이클 조회
   */
  findByIssueUrl(issueUrl: string): Promise<Cycle | null>;

  /**
   * 기수와 주차로 사이클 조회 (중복 체크용)
   */
  findByGenerationAndWeek(
    generationId: number,
    week: number
  ): Promise<Cycle | null>;

  /**
   * 기수별 모든 사이클 조회
   */
  findByGeneration(generationId: number): Promise<Cycle[]>;

  /**
   * 활성화된 기수의 진행 중인 사이클 조회
   */
  findActiveCyclesByGeneration(generationId: number): Promise<Cycle[]>;

  /**
   * 특정 시간 범위 내에 마감되는 사이클 조회 (리마인더용)
   */
  findCyclesWithDeadlineInRange(
    generationId: number,
    startTime: Date,
    endTime: Date
  ): Promise<Cycle[]>;

  /**
   * 조직의 진행 중인 사이클 조회 (organization context through generation)
   */
  findActiveCyclesByOrganization(organizationId: number): Promise<Cycle[]>;

  /**
   * 조직의 특정 시간 범위 내에 마감되는 사이클 조회
   */
  findCyclesWithDeadlineInRangeByOrganization(
    organizationId: number,
    startTime: Date,
    endTime: Date
  ): Promise<Cycle[]>;
}
