// Member Repository Implementation - Drizzle ORM

import { eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { members } from '../drizzle-db/schema';
import { Member, MemberId } from '../../../domain/member/member.domain';
import { MemberRepository } from '../../../domain/member/member.repository';

export class DrizzleMemberRepository implements MemberRepository {
  async save(member: Member): Promise<void> {
    const dto = member.toDTO();

    // ID가 0이면 새로운 회원 (생성)
    if (dto.id === 0) {
      await db.insert(members).values({
        discordId: dto.discordId,
        discordUsername: dto.discordUsername,
        discordAvatar: dto.discordAvatar,
        githubUsername: dto.githubUsername,
        name: dto.name,
      });
    } else {
      // 기존 회원 업데이트
      await db
        .update(members)
        .set({
          discordId: dto.discordId,
          discordUsername: dto.discordUsername,
          discordAvatar: dto.discordAvatar,
          githubUsername: dto.githubUsername,
          name: dto.name,
        })
        .where(eq(members.id, dto.id));
    }
  }

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

  async findByDiscordId(discordId: string): Promise<Member | null> {
    const result = await db
      .select()
      .from(members)
      .where(eq(members.discordId, discordId))
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
      .where(eq(members.githubUsername, githubUsername))
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

  private mapToEntity(row: {
    id: number;
    discordId: string;
    discordUsername: string | null;
    discordAvatar: string | null;
    githubUsername: string | null;
    name: string;
    createdAt: Date;
  }): Member {
    return Member.reconstitute({
      id: row.id,
      discordId: row.discordId,
      discordUsername: row.discordUsername ?? undefined,
      discordAvatar: row.discordAvatar ?? undefined,
      githubUsername: row.githubUsername ?? undefined,
      name: row.name,
      createdAt: row.createdAt,
    });
  }
}
