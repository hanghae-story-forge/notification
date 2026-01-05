// Member Repository Implementation - Drizzle ORM

import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { members } from '../../../db/schema';
import { Member, MemberId } from '../../../domain/member/member.domain';
import { MemberRepository } from '../../../domain/member/member.repository';

export class DrizzleMemberRepository implements MemberRepository {
  async findById(id: MemberId): Promise<Member | null> {
    const result = await db
      .select()
      .from(members)
      .where(eq(members.id, id.value))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByGithubUsername(githubUsername: string): Promise<Member | null> {
    const result = await db
      .select()
      .from(members)
      .where(eq(members.github, githubUsername))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findAll(): Promise<Member[]> {
    const result = await db.select().from(members);
    return result.map((row) => this.mapToEntity(row));
  }

  async save(member: Member): Promise<void> {
    const dto = member.toDTO();
    await db
      .update(members)
      .set({
        github: dto.github,
        name: dto.name,
        discordId: dto.discordId,
      })
      .where(eq(members.id, dto.id));
  }

  private mapToEntity(row: {
    id: number;
    github: string;
    name: string;
    discordId: string | null;
  }): Member {
    return Member.create({
      id: row.id,
      github: row.github,
      name: row.name,
      discordId: row.discordId ?? undefined,
    });
  }
}
