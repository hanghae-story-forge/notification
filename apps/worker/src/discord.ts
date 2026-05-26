export interface DiscordVerificationInput {
  publicKey: string;
  signature: string | null;
  timestamp: string | null;
  body: string;
}

export interface DiscordInteraction {
  type: number;
  data?: {
    name?: string;
  };
}

export interface DiscordInteractionResponse {
  type: number;
  data?: {
    content: string;
    flags?: number;
  };
}

const DISCORD_PING = 1;
const DISCORD_APPLICATION_COMMAND = 2;
const DISCORD_RESPONSE_PONG = 1;
const DISCORD_RESPONSE_CHANNEL_MESSAGE_WITH_SOURCE = 4;
const DISCORD_EPHEMERAL_FLAG = 64;

function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error("Invalid hex string");
    }
    bytes[index] = byte;
  }

  return bytes.buffer;
}

export async function verifyDiscordRequest({
  publicKey,
  signature,
  timestamp,
  body,
}: DiscordVerificationInput): Promise<boolean> {
  if (!signature || !timestamp || !publicKey) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToArrayBuffer(publicKey),
      {
        name: "Ed25519",
      },
      false,
      ["verify"],
    );

    return await crypto.subtle.verify(
      {
        name: "Ed25519",
      },
      key,
      hexToArrayBuffer(signature),
      new TextEncoder().encode(`${timestamp}${body}`).buffer,
    );
  } catch {
    return false;
  }
}

export function createDiscordInteractionResponse(
  interaction: DiscordInteraction,
): DiscordInteractionResponse | null {
  if (interaction.type === DISCORD_PING) {
    return { type: DISCORD_RESPONSE_PONG };
  }

  if (interaction.type === DISCORD_APPLICATION_COMMAND) {
    return {
      type: DISCORD_RESPONSE_CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content:
          "Cloudflare Worker 전환 준비가 완료되었어요. `/cycle current` 이식은 다음 단계에서 연결합니다.",
        flags: DISCORD_EPHEMERAL_FLAG,
      },
    };
  }

  return null;
}
