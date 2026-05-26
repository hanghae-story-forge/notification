import { Hono } from "hono";
import {
  createDiscordInteractionResponse,
  isCycleCurrentCommand,
  verifyDiscordRequest,
  type DiscordInteraction,
} from "./discord";
import { createCycleCurrentResponse } from "./cycle-current";
import {
  handleGithubWebhook,
  verifyGithubWebhookSignature,
} from "./github-webhook";
import { runDeadlineReminders } from "./scheduled-reminders";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (context) => {
  return context.json({
    status: "healthy",
    service: "donguel-donguel-notification-worker",
  });
});

app.post("/discord/interactions", async (context) => {
  const body = await context.req.text();
  const signature = context.req.header("x-signature-ed25519") ?? null;
  const timestamp = context.req.header("x-signature-timestamp") ?? null;

  const verified = await verifyDiscordRequest({
    publicKey: context.env.DISCORD_PUBLIC_KEY,
    signature,
    timestamp,
    body,
  });

  if (!verified) {
    return context.text("invalid request signature", 401);
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(body) as DiscordInteraction;
  } catch {
    return context.text("invalid interaction payload", 400);
  }

  const response = isCycleCurrentCommand(interaction)
    ? await createCycleCurrentResponse(context.env.DB)
    : createDiscordInteractionResponse(interaction);
  if (!response) {
    return context.text("unsupported interaction type", 400);
  }

  return context.json(response);
});

app.post("/webhook/github", async (context) => {
  const body = await context.req.text();
  const signature = context.req.header("x-hub-signature-256") ?? null;
  const verified = await verifyGithubWebhookSignature({
    body,
    secret: context.env.GITHUB_WEBHOOK_SECRET,
    signature,
  });

  if (!verified) {
    return context.text("invalid GitHub webhook signature", 401);
  }

  const result = await handleGithubWebhook({
    db: context.env.DB,
    event: context.req.header("x-github-event") ?? null,
    body,
  });

  return context.json(result.body, result.status as 200);
});

export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledController,
    env: Env,
    _context: ExecutionContext,
  ): Promise<void> {
    await runDeadlineReminders(env);
  },
};
