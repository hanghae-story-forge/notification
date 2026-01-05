import { MemberId, GitHubUsername } from '../shared';
import { GenerationId } from '../shared';
import { Member } from './member.entity';

export abstract class IMemberRepository {
  abstract save(member: Member): Promise<Member>;
  abstract findById(id: MemberId): Promise<Member | null>;
  abstract findByGitHub(username: GitHubUsername): Promise<Member | null>;
  abstract findAll(): Promise<Member[]>;
  abstract findMembersByGeneration(
    generationId: GenerationId
  ): Promise<Member[]>;
  abstract delete(id: MemberId): Promise<void>;
  abstract exists(github: GitHubUsername): Promise<boolean>;
}
