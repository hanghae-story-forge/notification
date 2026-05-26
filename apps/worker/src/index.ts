import { Hono } from "hono";
import {
  createDiscordInteractionResponse,
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

  return context.json(response);
});

app.post("/webhook/github", (context) => {
  return context.json(
    {
      error: "github_webhook_native_handler_not_implemented",
      message:
        "GitHub webhook must be handled natively in Cloudflare Worker; Render proxy is disabled.",
    },
    501,
  );
});

export default app;
