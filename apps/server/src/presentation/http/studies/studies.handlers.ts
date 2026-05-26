import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import type { AppContext } from '@/presentation/shared';
import { db } from '@/infrastructure/lib/db';
import {
  cycles,
  generations,
  members,
  organizations,
  submissions,
} from '@/infrastructure/persistence/drizzle-db/schema';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle/member.repository.impl';
import { DrizzleOrganizationMemberRepository } from '@/infrastructure/persistence/drizzle/organization-member.repository.impl';

const memberRepo = new DrizzleMemberRepository();
const organizationMemberRepo = new DrizzleOrganizationMemberRepository();

type OrganizationRow = typeof organizations.$inferSelect;
type CycleSummaryRow = {
  id: number;
  week: number;
  startDate: Date;
  endDate: Date;
  generationName: string;
  organizationId: number;
  submissionCount: number;
};

function toStudyDescription(organization: OrganizationRow) {
  return `${organization.name} 스터디의 기수, 회차, 제출글을 모아볼 수 있어요.`;
}

function toAuthorName(name: string | null, github: string | null) {
  const displayName = name || 'Unknown';
  return github ? `${displayName} @${github}` : displayName;
}

function getSubmissionTitleFromMetadata(metadata: unknown, url: string) {
  if (metadata && typeof metadata === 'object') {
    const record = metadata as Record<string, unknown>;
    const title = record.title ?? record.ogTitle ?? record.pageTitle;
    if (typeof title === 'string' && title.trim().length > 0) {
      return title.trim();
    }
  }
  return url;
}

function toStudyCard(
  organization: OrganizationRow,
  currentCycle?: CycleSummaryRow
) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: toStudyDescription(organization),
    isActive: organization.isActive,
    currentCycle: currentCycle
      ? {
          id: currentCycle.id,
          week: currentCycle.week,
          generationName: currentCycle.generationName,
          startDate: currentCycle.startDate.toISOString(),
          endDate: currentCycle.endDate.toISOString(),
          submissionCount: Number(currentCycle.submissionCount ?? 0),
        }
      : null,
  };
}

async function findLatestCyclesByOrganization(organizationIds: number[]) {
  if (organizationIds.length === 0) return new Map<number, CycleSummaryRow>();

  const rows = await db
    .select({
      id: cycles.id,
      week: cycles.week,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
      generationName: generations.name,
      organizationId: generations.organizationId,
      submissionCount: sql<number>`count(distinct ${submissions.id})::int`,
    })
    .from(cycles)
    .innerJoin(generations, eq(cycles.generationId, generations.id))
    .leftJoin(submissions, eq(submissions.cycleId, cycles.id))
    .where(inArray(generations.organizationId, organizationIds))
    .groupBy(cycles.id, generations.id)
    .orderBy(desc(cycles.startDate));

  const result = new Map<number, CycleSummaryRow>();
  for (const row of rows) {
    if (!result.has(row.organizationId)) {
      result.set(row.organizationId, row);
    }
  }
  return result;
}

async function getStudiesForOrganizations(orgRows: OrganizationRow[]) {
  const currentCyclesByOrg = await findLatestCyclesByOrganization(
    orgRows.map((organization) => organization.id)
  );
  return orgRows.map((organization) =>
    toStudyCard(organization, currentCyclesByOrg.get(organization.id))
  );
}

export const getPublicStudies = async (c: AppContext) => {
  const query = c.req.query('q')?.trim();

  const where = query
    ? and(
        eq(organizations.isActive, true),
        or(
          ilike(organizations.name, `%${query}%`),
          ilike(organizations.slug, `%${query}%`)
        )
      )
    : eq(organizations.isActive, true);

  const orgRows = await db
    .select()
    .from(organizations)
    .where(where)
    .orderBy(organizations.name);

  return c.json(
    { studies: await getStudiesForOrganizations(orgRows) },
    HttpStatusCodes.OK
  );
};

export const getMyStudies = async (c: AppContext) => {
  const discordUserId = c.req.header('x-discord-user-id');

  if (!discordUserId) {
    return c.json(
      { user: null, studies: [], message: 'Discord login required' },
      HttpStatusCodes.OK
    );
  }

  const member = await memberRepo.findByDiscordId(discordUserId);
  if (!member) {
    return c.json(
      {
        user: null,
        studies: [],
        message: '스터디봇에서 /member create를 먼저 진행해주세요.',
      },
      HttpStatusCodes.OK
    );
  }

  const organizationsForMember =
    await organizationMemberRepo.findByMemberWithOrganizations(member.id);
  const approvedOrganizationIds = organizationsForMember
    .filter(
      ({ organizationMember }) => organizationMember.status.value === 'APPROVED'
    )
    .map(({ organizationMember }) => organizationMember.organizationId.value);

  if (approvedOrganizationIds.length === 0) {
    return c.json(
      {
        user: member.toDTO(),
        studies: [],
        message: '아직 승인된 스터디가 없습니다.',
      },
      HttpStatusCodes.OK
    );
  }

  const orgRows = await db
    .select()
    .from(organizations)
    .where(inArray(organizations.id, approvedOrganizationIds))
    .orderBy(organizations.name);

  const studies = await getStudiesForOrganizations(orgRows);
  const mySubmissionStatus = await Promise.all(
    studies.map(async (study) => {
      if (!study.currentCycle) {
        return {
          organizationSlug: study.slug,
          cycleId: null,
          status: 'NO_CURRENT_CYCLE',
        };
      }

      const submitted = await db
        .select({
          id: submissions.id,
          url: submissions.url,
          metadata: submissions.metadata,
        })
        .from(submissions)
        .where(
          and(
            eq(submissions.cycleId, study.currentCycle.id),
            eq(submissions.memberId, member.id.value)
          )
        )
        .limit(1);

      return {
        organizationSlug: study.slug,
        cycleId: study.currentCycle.id,
        status: submitted.length > 0 ? 'SUBMITTED' : 'NOT_SUBMITTED',
        submission: submitted[0]
          ? {
              url: submitted[0].url,
              title: getSubmissionTitleFromMetadata(
                submitted[0].metadata,
                submitted[0].url
              ),
            }
          : null,
      };
    })
  );

  return c.json(
    {
      user: member.toDTO(),
      studies,
      mySubmissionStatus,
    },
    HttpStatusCodes.OK
  );
};

export const getStudyDetail = async (c: AppContext) => {
  const slug = c.req.param('slug');
  const organizationRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (organizationRows.length === 0) {
    return c.json({ error: 'Study not found' }, HttpStatusCodes.NOT_FOUND);
  }

  const organization = organizationRows[0];
  const generationRows = await db
    .select({
      id: generations.id,
      name: generations.name,
      startedAt: generations.startedAt,
      isActive: generations.isActive,
      status: generations.status,
    })
    .from(generations)
    .where(eq(generations.organizationId, organization.id))
    .orderBy(desc(generations.startedAt));

  const cycleRows = await db
    .select({
      id: cycles.id,
      week: cycles.week,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
      generationName: generations.name,
      generationId: generations.id,
      organizationId: generations.organizationId,
      submissionCount: sql<number>`count(distinct ${submissions.id})::int`,
    })
    .from(cycles)
    .innerJoin(generations, eq(cycles.generationId, generations.id))
    .leftJoin(submissions, eq(submissions.cycleId, cycles.id))
    .where(eq(generations.organizationId, organization.id))
    .groupBy(cycles.id, generations.id)
    .orderBy(desc(cycles.startDate));

  return c.json(
    {
      study: toStudyCard(organization, cycleRows[0]),
      generations: generationRows.map((generation) => ({
        ...generation,
        startedAt: generation.startedAt.toISOString(),
      })),
      cycles: cycleRows.map((cycle) => ({
        ...cycle,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        submissionCount: Number(cycle.submissionCount ?? 0),
      })),
    },
    HttpStatusCodes.OK
  );
};

export const getStudyCycleSubmissions = async (c: AppContext) => {
  const slug = c.req.param('slug');
  const cycleId = Number(c.req.param('cycleId'));

  if (!Number.isInteger(cycleId)) {
    return c.json(
      { error: 'cycleId must be a number' },
      HttpStatusCodes.BAD_REQUEST
    );
  }

  const rows = await db
    .select({
      organizationSlug: organizations.slug,
      cycleId: cycles.id,
      week: cycles.week,
      generationName: generations.name,
      startDate: cycles.startDate,
      endDate: cycles.endDate,
      memberName: members.name,
      githubUsername: members.githubUsername,
      url: submissions.url,
      metadata: submissions.metadata,
      submittedAt: submissions.submittedAt,
    })
    .from(cycles)
    .innerJoin(generations, eq(cycles.generationId, generations.id))
    .innerJoin(organizations, eq(generations.organizationId, organizations.id))
    .leftJoin(submissions, eq(submissions.cycleId, cycles.id))
    .leftJoin(members, eq(submissions.memberId, members.id))
    .where(and(eq(organizations.slug, slug), eq(cycles.id, cycleId)));

  if (rows.length === 0) {
    return c.json({ error: 'Cycle not found' }, HttpStatusCodes.NOT_FOUND);
  }

  const cycle = rows[0];
  return c.json(
    {
      cycle: {
        id: cycle.cycleId,
        week: cycle.week,
        generationName: cycle.generationName,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        organizationSlug: cycle.organizationSlug,
      },
      submissions: rows
        .filter((row) => row.url)
        .map((row) => ({
          author: toAuthorName(row.memberName, row.githubUsername),
          name: row.memberName ?? 'Unknown',
          github: row.githubUsername ?? '',
          url: row.url!,
          title: getSubmissionTitleFromMetadata(row.metadata, row.url!),
          submittedAt: row.submittedAt?.toISOString() ?? null,
        })),
    },
    HttpStatusCodes.OK
  );
};
