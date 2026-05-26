import { Hono } from "hono";
import {
  createDiscordInteractionResponse,
  isCycleCurrentCommand,
  updateCycleCurrentInteractionResponse,
  verifyDiscordRequest,
  type DiscordInteraction,
} from "./discord";

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

  const response = createDiscordInteractionResponse(interaction);
  if (!response) {
    return context.text("unsupported interaction type", 400);
  }

  if (isCycleCurrentCommand(interaction)) {
    context.executionCtx.waitUntil(
      updateCycleCurrentInteractionResponse(interaction, context.env),
    );
  }

  return context.json(response);
});

app.post("/webhook/github", async (context) => {
  const apiBaseUrl = context.env.API_BASE_URL.replace(/\/$/, "");
  const targetUrl = `${apiBaseUrl}/webhook/github`;
  const request = new Request(targetUrl, context.req.raw);

  return fetch(request);
});

export default app;
