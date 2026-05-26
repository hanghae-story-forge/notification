/* eslint-disable */
declare namespace Cloudflare {
  interface Env {
    DISCORD_PUBLIC_KEY: string;
    DISCORD_APPLICATION_ID: string;
    DISCORD_BOT_TOKEN: string;
    GITHUB_WEBHOOK_SECRET: string;
  }
}

interface Env extends Cloudflare.Env {}
