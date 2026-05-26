import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDiscordInteractionResponse,
  verifyDiscordRequest,
} from "../src/discord";
import worker from "../src/index";

class FakeD1Database {
  constructor(
    private readonly rows: Record<string, unknown[]> = {},
    private readonly calls: string[] = [],
    private readonly writes: Array<{ query: string; values: unknown[] }> = [],
  ) {}

  prepare(query: string) {
    this.calls.push(query);
    return {
      bind: (...values: unknown[]) => ({
        first: async <T = unknown>() => {
          if (query.includes("m.github_username")) {
            return (this.rows.githubSubmissionTarget?.[0] ?? null) as T | null;
          }

          return (this.rows.currentCycle?.[0] ?? null) as T | null;
        },
        all: async <T = unknown>() => {
          let results: unknown[];
          if (query.includes("submitted_members")) {
            results = this.rows.submittedMembers ?? [];
          } else if (query.includes("reminder_key")) {
            results = this.rows.reminderCycles ?? [];
          } else {
            results = this.rows.notSubmittedMembers ?? [];
          }
          return { results: results as T[] };
        },
        run: async () => {
          this.writes.push({ query, values });
          return { success: true, meta: {} } as D1Result;
        },
      }),
    };
  }

  dump(): Promise<ArrayBuffer> {
    throw new Error("not implemented");
  }

  batch<T = unknown>(): Promise<D1Result<T>[]> {
    throw new Error("not implemented");
  }

  exec(): Promise<D1ExecResult> {
    throw new Error("not implemented");
  }

  getQueries() {
    return this.calls;
  }

  getWrites() {
    return this.writes;
  }
}

const env: Env = {
  DB: new FakeD1Database() as unknown as D1Database,
  DISCORD_PUBLIC_KEY:
    "0000000000000000000000000000000000000000000000000000000000000000",
  DISCORD_APPLICATION_ID: "1457578741097042114",
  DISCORD_BOT_TOKEN: "test-token",
  DISCORD_WEBHOOK_URL: "https://discord.example.test/webhook",
  GITHUB_WEBHOOK_SECRET: "test-secret",
};

afterEach(() => {
  vi.restoreAllMocks();
});

async function githubSignature(
  body: string,
  secret = env.GITHUB_WEBHOOK_SECRET,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return `sha256=${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

describe("notification Cloudflare Worker", () => {
  it("returns health information without waking Render", async () => {
    const response = await worker.fetch(
      new Request("https://worker.example.test/health"),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "healthy",
      service: "donguel-donguel-notification-worker",
    });
  });

  it("rejects Discord interactions without a valid signature", async () => {
    const response = await worker.fetch(
      new Request("https://worker.example.test/discord/interactions", {
        method: "POST",
        body: JSON.stringify({ type: 1 }),
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(401);
  });

  it("responds to Discord ping interactions after signature verification", async () => {
    const verifySpy = vi
      .spyOn(crypto.subtle, "verify")
      .mockResolvedValueOnce(true);

    const response = await worker.fetch(
      new Request("https://worker.example.test/discord/interactions", {
        method: "POST",
        headers: {
          "x-signature-ed25519": "00".repeat(64),
          "x-signature-timestamp": "1710000000",
        },
        body: JSON.stringify({ type: 1 }),
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ type: 1 });
    expect(verifySpy).toHaveBeenCalledOnce();
  });

  it("returns a scaffold response for application commands", async () => {
    const response = createDiscordInteractionResponse({
      type: 2,
      data: { name: "unknown" },
    });

    expect(response).toEqual({
      type: 4,
      data: {
        content:
          "Cloudflare Worker 전환 준비가 완료되었어요. 지원하지 않는 명령은 Cloudflare-native handler로 순차 이식합니다.",
        flags: 64,
      },
    });
  });

  it("handles /cycle current from D1 without calling Render", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const d1 = new FakeD1Database({
      currentCycle: [
        {
          id: 7,
          week: 7,
          generation_name: "똥글똥글 2기",
          organization_slug: "donguel-donguel",
          start_date: "2026-05-12T00:00:00.000Z",
          end_date: "2999-05-26T14:59:59.000Z",
          github_issue_url:
            "https://github.com/hanghae-story-forge/archive/issues/16",
          required_count: 3,
          submitted_count: 2,
        },
      ],
      submittedMembers: [
        {
          name: "박준형",
          github_username: "BBAK-jun",
          url: "https://blog.dev/post",
        },
        {
          name: "김항해",
          github_username: "hanghae",
          url: "https://blog.dev/2",
        },
      ],
      notSubmittedMembers: [{ name: "미제출", github_username: "missing" }],
    });
    const response = await worker.fetch(
      new Request("https://worker.example.test/discord/interactions", {
        method: "POST",
        headers: {
          "x-signature-ed25519": "00".repeat(64),
          "x-signature-timestamp": "1710000000",
        },
        body: JSON.stringify({
          type: 2,
          data: {
            name: "cycle",
            options: [{ type: 1, name: "current" }],
          },
        }),
      }),
      { ...env, DB: d1 as unknown as D1Database },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      type: 4,
      data: {
        content: expect.stringContaining("똥글똥글 2기 7주차"),
      },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(d1.getQueries().join("\n")).toContain("FROM cycles");
  });

  it("records GitHub issue_comment submissions in D1 without calling Render", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const d1 = new FakeD1Database({
      githubSubmissionTarget: [
        {
          cycle_id: 7,
          member_id: 42,
          member_name: "박준형",
          generation_name: "똥글똥글 2기",
          organization_slug: "donguel-donguel",
          cycle_week: 7,
        },
      ],
    });
    const body = JSON.stringify({
      action: "created",
      comment: {
        id: 12345,
        body: "제출합니다 https://blog.dev/week-7",
        user: { login: "BBAK-jun" },
      },
      issue: {
        html_url: "https://github.com/hanghae-story-forge/archive/issues/16",
      },
    });

    const response = await worker.fetch(
      new Request("https://worker.example.test/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
          "x-hub-signature-256": await githubSignature(body),
        },
        body,
      }),
      { ...env, DB: d1 as unknown as D1Database },
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: "Submission recorded",
      memberName: "박준형",
      cycleWeek: 7,
    });
    expect(d1.getWrites()).toHaveLength(1);
    expect(d1.getWrites()[0]?.query).toContain("INSERT INTO submissions");
    expect(d1.getWrites()[0]?.values).toEqual([
      7,
      42,
      "https://blog.dev/week-7",
      "12345",
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects GitHub webhooks with an invalid signature", async () => {
    const response = await worker.fetch(
      new Request("https://worker.example.test/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
          "x-hub-signature-256": "sha256=bad",
        },
        body: JSON.stringify({ action: "created" }),
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(401);
  });

  it("sends upcoming deadline reminders from Workers Cron and records a D1 log", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const d1 = new FakeD1Database({
      reminderCycles: [
        {
          cycle_id: 7,
          cycle_week: 7,
          generation_name: "똥글똥글 2기",
          organization_slug: "donguel-donguel",
          github_issue_url:
            "https://github.com/hanghae-story-forge/archive/issues/16",
          end_date: "2999-05-26T14:59:59.000Z",
          missing_members: "미제출(missing), 김항해(hanghae)",
          reminder_key: "cycle:7:deadline-minus-1d",
        },
      ],
    });

    await (
      worker as unknown as {
        scheduled: (
          event: ScheduledController,
          env: Env,
          context: ExecutionContext,
        ) => Promise<void>;
      }
    ).scheduled(
      { cron: "0 0 * * *", scheduledTime: Date.now(), noRetry: vi.fn() },
      { ...env, DB: d1 as unknown as D1Database },
      {
        waitUntil: vi.fn(),
        passThroughOnException: vi.fn(),
      } as unknown as ExecutionContext,
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      env.DISCORD_WEBHOOK_URL,
      expect.objectContaining({ method: "POST" }),
    );
    expect(
      d1.getWrites().some((write) => write.query.includes("notification_logs")),
    ).toBe(true);
  });

  it("verifies Discord signatures using timestamp plus raw body", async () => {
    const verifySpy = vi
      .spyOn(crypto.subtle, "verify")
      .mockResolvedValueOnce(true);

    const verified = await verifyDiscordRequest({
      publicKey: env.DISCORD_PUBLIC_KEY,
      signature: "00".repeat(64),
      timestamp: "1710000000",
      body: '{"type":1}',
    });

    expect(verified).toBe(true);
    const [, , , signedPayload] = verifySpy.mock.calls[0] ?? [];
    expect(new TextDecoder().decode(signedPayload as ArrayBuffer)).toBe(
      '1710000000{"type":1}',
    );
  });
});
