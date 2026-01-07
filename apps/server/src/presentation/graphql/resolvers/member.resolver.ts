// Member Domain Resolvers

import {
  GetAllMembersQuery,
  GetMemberByGithubQuery,
  CreateMemberCommand,
} from '@/application';
import { DrizzleMemberRepository } from '@/infrastructure/persistence/drizzle';
import { MemberService } from '@/domain/member/member.service';
import { GqlMember } from '../types';
import { domainToGraphqlMember } from '../mappers';

// ========================================
// Repository & Service Instances
// ========================================

const memberRepo = new DrizzleMemberRepository();
const memberService = new MemberService(memberRepo);

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
