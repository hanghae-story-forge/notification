declare namespace Cloudflare {
  interface Env {
    APP_ENV?: 'local' | 'staging' | 'production';
    API_BASE_URL?: string;
    DISCORD_COMMAND_SYNC_POLICY?: 'interactions';
    DISCORD_PUBLIC_KEY?: string;
    DISCORD_APPLICATION_ID?: string;
    DISCORD_BOT_TOKEN?: string;
    GITHUB_WEBHOOK_SECRET?: string;
  }
}
