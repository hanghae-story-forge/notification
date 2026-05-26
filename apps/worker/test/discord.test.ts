import { describe, expect, it, vi } from "vitest";
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
      data: { name: "cycle" },
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
