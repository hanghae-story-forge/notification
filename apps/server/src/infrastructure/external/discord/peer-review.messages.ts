interface DiscordMessagePayload {
  content: string;
  ephemeral?: boolean;
}

export function createPeerReviewTemplateMessage(): DiscordMessagePayload {
  return {
    content:
      '## 📝 똥글똥글 3기 제출 템플릿\n\n' +
      '글을 제출할 때 아래 내용을 함께 남겨주세요.\n\n' +
      '### 제목\n' +
      '글 제목을 적어주세요.\n\n' +
      '### 링크\n' +
      'https://...\n\n' +
      '### 소개 / 소감\n' +
      '1. 이 글은 무엇에 대한 글인지\n' +
      '2. 왜 이 글을 쓰게 되었는지\n' +
      '3. 쓰고 나서 만족스럽거나 아쉬운 점\n\n' +
      '### 스스로의 만족도\n' +
      '7 / 10\n\n' +
      '## 💬 감상평은 이렇게 남겨도 충분해요\n\n' +
      '감상평은 평가나 채점이 아니라, 읽은 사람이 남기는 짧은 반응이에요.\n' +
      '아래 중 하나만 골라서 2~5문장 정도로 남겨도 충분합니다.\n\n' +
      '- 인상 깊었던 부분\n' +
      '- 새로 알게 된 점\n' +
      '- 비슷한 경험\n' +
      '- 더 궁금해진 점',
  };
}

export function createPeerReviewMyAssignmentMessage(input: {
  cycleName: string;
  revieweeName: string;
  submissionUrl: string;
}): DiscordMessagePayload {
  return {
    ephemeral: true,
    content:
      `💎 **${input.cycleName} 감상평 배정**\n\n` +
      `이번 회차에는 **${input.revieweeName}**님의 글을 읽어주세요.\n` +
      `글 링크: ${input.submissionUrl}\n\n` +
      '감상평은 길지 않아도 괜찮아요. 좋았던 점, 기억에 남은 부분, 궁금한 점 중 하나만 2~5문장으로 남겨주세요.\n\n' +
      '남긴 뒤에는 `/review done`으로 완료 처리해 주세요.',
  };
}

export function createPeerReviewNoAssignmentMessage(input: {
  cycleName: string;
}): DiscordMessagePayload {
  return {
    ephemeral: true,
    content:
      `💎 **${input.cycleName}**에는 아직 배정된 글이 없어요.\n\n` +
      '운영자가 `/review assign`으로 이번 회차 감상평 매칭을 만든 뒤 다시 확인해 주세요.',
  };
}

export function createPeerReviewStatusMessage(input: {
  cycleName: string;
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  cancelled: number;
}): DiscordMessagePayload {
  return {
    content:
      `📚 **${input.cycleName} 감상평 현황**\n\n` +
      `완료: **${input.completed} / ${input.total}**\n` +
      `남은 감상평: ${input.pending}개\n` +
      `스킵: ${input.skipped}개\n` +
      `취소: ${input.cancelled}개\n\n` +
      '감상평은 평가가 아니라 서로의 글을 읽었다는 짧은 반응이면 충분해요.',
  };
}

export function createPeerReviewDoneMessage(input: {
  cycleName: string;
}): DiscordMessagePayload {
  return {
    ephemeral: true,
    content:
      `✅ **${input.cycleName} 감상평을 완료로 기록했어요.**\n\n` +
      '서로 읽어주는 흐름을 만들어줘서 고마워요.',
  };
}
