export interface DiscordVerificationInput {
  publicKey: string;
  signature: string | null;
  timestamp: string | null;
  body: string;
}

export interface DiscordCommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: DiscordCommandOption[];
}

export interface DiscordInteraction {
  type: number;
  application_id?: string;
  token?: string;
  data?: {
    name?: string;
    options?: DiscordCommandOption[];
  };
}

export interface DiscordInteractionResponse {
  type: number;
  data?: DiscordMessagePayload;
}

export interface DiscordMessagePayload {
  content?: string;
  flags?: number;
  components?: DiscordActionRow[];
}

interface DiscordActionRow {
  type: 1;
  components: DiscordLinkButton[];
}

interface DiscordLinkButton {
  type: 2;
  style: 5;
  label: string;
  url: string;
}

interface CurrentCycleResponse {
  id: number;
  week: number;
  generationName: string;
  startDate: string;
  endDate: string;
  githubIssueUrl: string | null;
  daysLeft: number;
  hoursLeft?: number;
  organizationSlug: string;
}

const DISCORD_PING = 1;
const DISCORD_APPLICATION_COMMAND = 2;
const DISCORD_RESPONSE_PONG = 1;
const DISCORD_RESPONSE_CHANNEL_MESSAGE_WITH_SOURCE = 4;
const DISCORD_RESPONSE_DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5;
const DISCORD_EPHEMERAL_FLAG = 64;
const DISCORD_SUBCOMMAND_OPTION = 1;
const DEFAULT_ORGANIZATION_SLUG = "donguel-donguel";
const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

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

export function isCycleCurrentCommand(
  interaction: DiscordInteraction,
): boolean {
  if (
    interaction.type !== DISCORD_APPLICATION_COMMAND ||
    interaction.data?.name !== "cycle"
  ) {
    return false;
  }

  return (
    interaction.data.options?.some(
      (option) =>
        option.type === DISCORD_SUBCOMMAND_OPTION && option.name === "current",
    ) === true
  );
}

export function createDiscordInteractionResponse(
  interaction: DiscordInteraction,
): DiscordInteractionResponse | null {
  if (interaction.type === DISCORD_PING) {
    return { type: DISCORD_RESPONSE_PONG };
  }

  if (isCycleCurrentCommand(interaction)) {
    return { type: DISCORD_RESPONSE_DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
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

export async function updateCycleCurrentInteractionResponse(
  interaction: DiscordInteraction,
  env: Env,
): Promise<void> {
  if (!interaction.token) {
    return;
  }

  const applicationId =
    interaction.application_id ?? env.DISCORD_APPLICATION_ID;
  const payload = await createCycleCurrentMessage(env);

  await fetch(
    `${DISCORD_API_BASE_URL}/webhooks/${applicationId}/${interaction.token}/messages/@original`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

async function createCycleCurrentMessage(
  env: Env,
): Promise<DiscordMessagePayload> {
  const apiBaseUrl = env.API_BASE_URL.replace(/\/$/, "");
  const response = await fetch(
    `${apiBaseUrl}/api/status/current?organizationSlug=${encodeURIComponent(
      DEFAULT_ORGANIZATION_SLUG,
    )}`,
  );

  if (response.status === 404) {
    return {
      content:
        "🗓️ **현재 진행 중인 주차를 찾지 못했어요.**\n\n" +
        "가능한 원인\n" +
        "1. 아직 이번 주차가 생성되지 않았어요.\n" +
        "2. 스터디 운영 설정이 아직 반영되지 않았을 수 있어요.\n" +
        "3. 잠시 후 다시 시도해 주세요.\n\n" +
        "운영자라면 `/cycle list`로 등록된 주차를 확인해 주세요.",
    };
  }

  if (!response.ok) {
    return {
      content:
        "❌ 주차 정보 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const currentCycle = (await response.json()) as CurrentCycleResponse;
  return formatCycleCurrentMessage(currentCycle);
}

function formatCycleCurrentMessage(
  currentCycle: CurrentCycleResponse,
): DiscordMessagePayload {
  const remainingTime = formatRemainingTime(
    currentCycle.daysLeft,
    currentCycle.hoursLeft,
  );
  const issueLinkText = currentCycle.githubIssueUrl
    ? `이슈 링크: ${currentCycle.githubIssueUrl}\n\n`
    : "이슈 링크: 아직 등록되지 않았어요.\n\n";

  return {
    content:
      `📅 **${currentCycle.generationName} ${currentCycle.week}주차가 진행 중이에요**\n\n` +
      `⏰ **${remainingTime}**\n` +
      `마감일: ${new Date(currentCycle.endDate).toLocaleString("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      })}\n` +
      issueLinkText +
      "**다음 행동**\n" +
      "1. 이번 주차 글을 작성해 주세요.\n" +
      "2. GitHub 이슈에 제출 링크를 댓글로 남겨 주세요.\n" +
      "3. 제출 후 `/me info`로 내 상태를 다시 확인해 주세요.",
    components: createIssueButton(currentCycle.githubIssueUrl),
  };
}

function formatRemainingTime(daysLeft: number, hoursLeft?: number): string {
  if (daysLeft <= 0 && (!hoursLeft || hoursLeft <= 0)) {
    return "오늘 마감";
  }

  if (typeof hoursLeft === "number") {
    return `마감까지 ${daysLeft}일 ${hoursLeft}시간`;
  }

  return daysLeft > 0 ? `마감까지 ${daysLeft}일` : "오늘 마감";
}

function createIssueButton(issueUrl?: string | null): DiscordActionRow[] {
  if (!issueUrl) return [];

  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "이번 주차 이슈 열기",
          url: issueUrl,
        },
      ],
    },
  ];
}
