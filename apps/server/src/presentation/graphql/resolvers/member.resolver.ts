// Member Domain Resolvers

import {
  container,
  MEMBER_REPO_TOKEN,
  MEMBER_SERVICE_TOKEN,
} from '@/shared/di';
import type { MemberRepository, MemberService } from '@/domain';
import {
  GetAllMembersQuery,
  GetMemberByGithubQuery,
  CreateMemberCommand,
} from '@/application';
import { GqlMember } from '../types';
import { domainToGraphqlMember } from '../mappers';

// ========================================
// Resolve Dependencies from Container
// ========================================

const memberRepo = container.resolve<MemberRepository>(MEMBER_REPO_TOKEN);
const memberService = container.resolve<MemberService>(MEMBER_SERVICE_TOKEN);

// ========================================
// Query & Command Instances
// ========================================

const getAllMembersQuery = new GetAllMembersQuery(memberRepo);
const getMemberByGithubQuery = new GetMemberByGithubQuery(memberRepo);
const createMemberCommand = new CreateMemberCommand(memberRepo, memberService);

// ========================================
// Resolvers
// ========================================

export const memberQueries = {
  // 멤버 전체 조회
  members: async (): Promise<GqlMember[]> => {
    const members = await getAllMembersQuery.execute();
    return members.map(domainToGraphqlMember);
  },

  // 멤버 단건 조회 (GitHub username으로)
  member: async (github: string): Promise<GqlMember | null> => {
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
    const result = await createMemberCommand.execute({
      githubUsername: github,
      name,
      discordId,
    });
    return domainToGraphqlMember(result.member);
  },
};
