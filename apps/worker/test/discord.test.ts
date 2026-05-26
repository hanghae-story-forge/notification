import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDiscordInteractionResponse,
  verifyDiscordRequest,
} from "../src/discord";
import worker from "../src/index";

const env: Env = {
  DISCORD_PUBLIC_KEY:
    "0000000000000000000000000000000000000000000000000000000000000000",
  DISCORD_APPLICATION_ID: "1457578741097042114",
  DISCORD_BOT_TOKEN: "test-token",
  GITHUB_WEBHOOK_SECRET: "test-secret",
  API_BASE_URL: "https://api.example.test",
};

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("returns a scaffold response for unsupported application commands", async () => {
    const response = createDiscordInteractionResponse({
      type: 2,
      data: { name: "unsupported" },
    });

    expect(response).toEqual({
      type: 4,
      data: {
        content:
          "Cloudflare Worker 전환 준비가 완료되었어요. `/cycle current` 이식은 다음 단계에서 연결합니다.",
        flags: 64,
      },
    });
  });

  it("defers /cycle current and schedules an original interaction response update", async () => {
    vi.spyOn(crypto.subtle, "verify").mockResolvedValueOnce(true);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 42,
          week: 3,
          generationName: "똥글똥글 2기",
          startDate: "2026-05-20T00:00:00.000Z",
          endDate: "2026-05-27T12:00:00.000Z",
          githubIssueUrl: "https://github.com/org/repo/issues/42",
          daysLeft: 1,
          hoursLeft: 4,
          organizationSlug: "donguel-donguel",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    const scheduledTasks: Promise<unknown>[] = [];
    const executionContext = {
      waitUntil: (promise: Promise<unknown>) => scheduledTasks.push(promise),
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext;

    const response = await worker.fetch(
      new Request("https://worker.example.test/discord/interactions", {
        method: "POST",
        headers: {
          "x-signature-ed25519": "00".repeat(64),
          "x-signature-timestamp": "1710000000",
        },
        body: JSON.stringify({
          type: 2,
          application_id: env.DISCORD_APPLICATION_ID,
          token: "interaction-token",
          data: {
            name: "cycle",
            options: [{ name: "current", type: 1 }],
          },
        }),
      }),
      env,
      executionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ type: 5 });
    expect(scheduledTasks).toHaveLength(1);

    await Promise.all(scheduledTasks);

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      "https://api.example.test/api/status/current?organizationSlug=donguel-donguel",
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "https://discord.com/api/v10/webhooks/1457578741097042114/interaction-token/messages/@original",
      expect.objectContaining({
        method: "PATCH",
        headers: { "content-type": "application/json" },
      }),
    );
    const updateRequest = fetchSpy.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(updateRequest.body as string)).toMatchObject({
      content: expect.stringContaining(
        "📅 **똥글똥글 2기 3주차가 진행 중이에요**",
      ),
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: "이번 주차 이슈 열기",
              url: "https://github.com/org/repo/issues/42",
            },
          ],
        },
      ],
    });
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
