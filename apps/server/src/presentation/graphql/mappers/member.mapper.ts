// Member Mapper

import { Member } from '@/domain/member/member.domain';
import { GqlMember } from '../types';

export const domainToGraphqlMember = (member: Member): GqlMember => {
  return new GqlMember(member);
};

export const createGqlMember = (
  id: number,
  github: string,
  name: string,
  createdAt: string
): GqlMember => {
  const gqlMember = new GqlMember({
    id: { value: id },
    githubUsername: { value: github },
    name: { value: name },
    discordId: undefined,
    createdAt: new Date(createdAt),
  } as unknown as Member);
  return gqlMember;
};
