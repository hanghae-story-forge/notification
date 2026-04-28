export type WorkerEnv = {
  APP_ENV?: 'local' | 'staging' | 'production';
  API_BASE_URL?: string;
  DISCORD_COMMAND_SYNC_POLICY?: 'interactions';
  DISCORD_PUBLIC_KEY?: string;
  DISCORD_APPLICATION_ID?: string;
  DISCORD_BOT_TOKEN?: string;
  GITHUB_WEBHOOK_SECRET?: string;
};

export type DiscordInteraction = {
  id?: string;
  type: number;
  data?: {
    id?: string;
    name?: string;
    type?: number;
    options?: Array<{ name: string; type: number; value?: unknown }>;
  };
};

export const DISCORD_INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

export const DISCORD_RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init?.headers,
    },
  });
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

async function verifyEd25519Signature({
  publicKey,
  signature,
  message,
}: {
  publicKey: string;
  signature: string;
  message: string;
}): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    hexToArrayBuffer(publicKey),
    { name: 'Ed25519', namedCurve: 'Ed25519' },
    false,
    ['verify']
  );

  return crypto.subtle.verify(
    'Ed25519',
    key,
    hexToArrayBuffer(signature),
    new TextEncoder().encode(message)
  );
}

export async function verifyDiscordRequest(
  request: Request,
  body: string,
  env: WorkerEnv
): Promise<boolean> {
  if (!env.DISCORD_PUBLIC_KEY) {
    return false;
  }

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');

  if (!signature || !timestamp) {
    return false;
  }

  try {
    return await verifyEd25519Signature({
      publicKey: env.DISCORD_PUBLIC_KEY,
      signature,
      message: `${timestamp}${body}`,
    });
  } catch {
    return false;
  }
}

export function createDiscordCommandScaffoldResponse(interaction: DiscordInteraction) {
  const commandName = interaction.data?.name ?? 'unknown';

  return {
    type: DISCORD_RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      flags: 64,
      content:
        `🧪 Cloudflare Workers 이전 환경이 연결됐어요.\n\n` +
        `수신한 명령어: \`/${commandName}\`\n` +
        `현재 PR은 Render sleep 문제를 피하기 위한 Discord Interaction Endpoint 기반 이전 준비 단계예요.`,
    },
  };
}
