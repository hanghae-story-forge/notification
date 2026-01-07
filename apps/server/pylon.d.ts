import '@getcronit/pylon';

declare module '@getcronit/pylon' {
  interface Bindings {
    DISCORD_WEBHOOK_URL?: string;
    GITHUB_WEBHOOK_SECRET?: string;
    NODE_ENV: string;
    PORT?: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Variables {
    // Add any runtime variables if needed
  }
}
