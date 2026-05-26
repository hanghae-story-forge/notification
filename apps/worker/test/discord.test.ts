import { describe, expect, it, vi } from "vitest";
import {
  createDiscordInteractionResponse,
  verifyDiscordRequest,
} from "../src/discord";
import worker from "../src/index";

class FakeD1Database {
  constructor(
    private readonly rows: Record<string, unknown[]> = {},
    private readonly calls: string[] = [],
  ) {}

  prepare(query: string) {
    this.calls.push(query);
    return {
      bind: (..._values: unknown[]) => ({
        first: async <T = unknown>() =>
          (this.rows.currentCycle?.[0] ?? null) as T | null,
        all: async <T = unknown>() => ({
          results: (query.includes("submitted_members")
            ? (this.rows.submittedMembers ?? [])
            : (this.rows.notSubmittedMembers ?? [])) as T[],
        }),
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
}

const env: Env = {
  DB: new FakeD1Database() as unknown as D1Database,
  DISCORD_PUBLIC_KEY:
    "0000000000000000000000000000000000000000000000000000000000000000",
  DISCORD_APPLICATION_ID: "1457578741097042114",
  DISCORD_BOT_TOKEN: "test-token",
  GITHUB_WEBHOOK_SECRET: "test-secret",
};

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

  it("does not proxy GitHub webhooks to Render", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await worker.fetch(
      new Request("https://worker.example.test/webhook/github", {
        method: "POST",
        body: JSON.stringify({ action: "created" }),
      }),
      env,
      {} as ExecutionContext,
    );

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      error: "github_webhook_native_handler_not_implemented",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
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
