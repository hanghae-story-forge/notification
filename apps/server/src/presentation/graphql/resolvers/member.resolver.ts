// Member Domain Resolvers

import {
  container,
  MEMBER_REPO_TOKEN,
  MEMBER_SERVICE_TOKEN,
  ORGANIZATION_MEMBER_REPO_TOKEN,
  ORGANIZATION_REPO_TOKEN,
} from '@/shared/di';
import type {
  MemberRepository,
  MemberService,
  OrganizationMemberRepository,
  OrganizationRepository,
} from '@/domain';
import {
  GetAllMembersQuery,
  GetMemberByGithubQuery,
  CreateMemberCommand,
} from '@/application';
import { GqlMember } from '../types';
import { domainToGraphqlMember } from '../mappers';

// ========================================
// Lazy Dependency Resolution
// ========================================
// Using lazy getters to ensure DI is registered before resolution
// This is needed because modules may be evaluated before registerDependencies() is called

let getAllMembersQuery: GetAllMembersQuery | null = null;
let getMemberByGithubQuery: GetMemberByGithubQuery | null = null;
let createMemberCommand: CreateMemberCommand | null = null;
let memberRepo: MemberRepository | null = null;
let organizationRepo: OrganizationRepository | null = null;
let organizationMemberRepo: OrganizationMemberRepository | null = null;

const getQueries = () => {
  if (!getAllMembersQuery || !getMemberByGithubQuery || !createMemberCommand) {
    memberRepo = container.resolve<MemberRepository>(MEMBER_REPO_TOKEN);
    const memberService =
      container.resolve<MemberService>(MEMBER_SERVICE_TOKEN);
    organizationRepo = container.resolve<OrganizationRepository>(
      ORGANIZATION_REPO_TOKEN
    );
    organizationMemberRepo = container.resolve<OrganizationMemberRepository>(
      ORGANIZATION_MEMBER_REPO_TOKEN
    );

    getAllMembersQuery = new GetAllMembersQuery(memberRepo);
    getMemberByGithubQuery = new GetMemberByGithubQuery(memberRepo);
    createMemberCommand = new CreateMemberCommand(memberRepo, memberService);
  }
  return {
    getAllMembersQuery,
    getMemberByGithubQuery,
    createMemberCommand,
    memberRepo,
    organizationRepo,
    organizationMemberRepo,
  };
};

// ========================================
// Resolvers
// ========================================

export const memberQueries = {
  // 멤버 전체 조회
  members: async (organizationSlug?: string): Promise<GqlMember[]> => {
    const {
      getAllMembersQuery,
      memberRepo,
      organizationRepo,
      organizationMemberRepo,
    } = getQueries();

    if (organizationSlug) {
      const organization = await organizationRepo!.findBySlug(organizationSlug);
      if (!organization) return [];
      const orgMembers = await organizationMemberRepo!.findActiveByOrganization(
        organization.id
      );
      const members = await Promise.all(
        orgMembers.map((orgMember) => memberRepo!.findById(orgMember.memberId))
      );
      return members
        .filter((member) => member !== null)
        .map(domainToGraphqlMember);
    }

    const members = await getAllMembersQuery.execute();
    return members.map(domainToGraphqlMember);
  },

  // 멤버 단건 조회 (GitHub username으로)
  member: async (github: string): Promise<GqlMember | null> => {
    const { getMemberByGithubQuery } = getQueries();
    const member = await getMemberByGithubQuery.execute(github);
    return member ? domainToGraphqlMember(member) : null;
  },
};

export const memberMutations = {
  // 멤버 추가
  addMember: async (
    github: string,
    name: string,
    discordId?: string
  ): Promise<GqlMember> => {
    const { createMemberCommand } = getQueries();
    const result = await createMemberCommand.execute({
      githubUsername: github,
      name,
      discordId,
    });
    return domainToGraphqlMember(result.member);
  },
};
