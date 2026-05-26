const API_BASE_URL = '';

const elements = {
  form: document.querySelector('#statusForm'),
  organizationSlug: document.querySelector('#organizationSlug'),
  cycleId: document.querySelector('#cycleId'),
  loadCurrentCycle: document.querySelector('#loadCurrentCycle'),
  apiState: document.querySelector('#apiState'),
  currentScope: document.querySelector('#currentScope'),
  updatedAt: document.querySelector('#updatedAt'),
  message: document.querySelector('#message'),
  dashboard: document.querySelector('#dashboard'),
  cycleTitle: document.querySelector('#cycleTitle'),
  cyclePeriod: document.querySelector('#cyclePeriod'),
  meterFill: document.querySelector('#meterFill'),
  submissionRate: document.querySelector('#submissionRate'),
  submittedCount: document.querySelector('#submittedCount'),
  notSubmittedCount: document.querySelector('#notSubmittedCount'),
  submittedBadge: document.querySelector('#submittedBadge'),
  notSubmittedBadge: document.querySelector('#notSubmittedBadge'),
  submittedList: document.querySelector('#submittedList'),
  notSubmittedList: document.querySelector('#notSubmittedList'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function getOrganizationSlug() {
  return elements.organizationSlug.value.trim() || 'donguel-donguel';
}

function showMessage(type, text) {
  elements.message.hidden = false;
  elements.message.className = `message ${type}`;
  elements.message.textContent = text;
}

function clearMessage() {
  elements.message.hidden = true;
  elements.message.textContent = '';
}

async function fetchJson(path) {
  elements.apiState.textContent = '불러오는 중';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error ?? `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  elements.apiState.textContent = '연결됨';
  return payload;
}

async function loadCurrentCycle() {
  clearMessage();
  const organizationSlug = encodeURIComponent(getOrganizationSlug());

  try {
    const current = await fetchJson(
      `/api/status/current?organizationSlug=${organizationSlug}`,
    );
    elements.cycleId.value = current.id;
    elements.currentScope.textContent = `${current.generationName} ${current.week}주차`;
    showMessage('success', '현재 진행 중인 회차를 불러왔어요. 제출 현황도 함께 조회합니다.');
    await loadCycleStatus();
  } catch (error) {
    elements.apiState.textContent = '응답 오류';
    if (error.status === 404) {
      showMessage(
        'warning',
        '현재 active 회차가 없어요. 회차 ID를 직접 입력해서 과거/운영 회차 현황을 조회할 수 있습니다.',
      );
      return;
    }

    showMessage('error', `현재 회차를 불러오지 못했어요: ${error.message}`);
  }
}

async function loadCycleStatus() {
  clearMessage();
  const organizationSlug = encodeURIComponent(getOrganizationSlug());
  const cycleId = elements.cycleId.value.trim();

  if (!/^\d+$/.test(cycleId)) {
    showMessage('error', '회차 ID는 숫자로 입력해주세요.');
    return;
  }

  try {
    const status = await fetchJson(
      `/api/status/${cycleId}?organizationSlug=${organizationSlug}`,
    );
    renderStatus(status);
  } catch (error) {
    elements.apiState.textContent = '응답 오류';
    showMessage('error', `제출 현황을 불러오지 못했어요: ${error.message}`);
  }
}

function renderStatus(status) {
  const { cycle, summary, submitted, notSubmitted } = status;
  const submittedCount = summary.submitted;
  const totalCount = summary.total;
  const rate = totalCount === 0 ? 0 : Math.round((submittedCount / totalCount) * 100);

  elements.dashboard.hidden = false;
  elements.currentScope.textContent = `${cycle.generationName} ${cycle.week}주차`;
  elements.updatedAt.textContent = formatDateTime(new Date().toISOString());
  elements.cycleTitle.textContent = `${cycle.generationName} ${cycle.week}주차`;
  elements.cyclePeriod.textContent = `${formatDateTime(cycle.startDate)} → ${formatDateTime(cycle.endDate)}`;
  elements.submissionRate.textContent = `제출률 ${rate}%`;
  elements.submittedCount.textContent = `${summary.submitted} / ${summary.total}`;
  elements.notSubmittedCount.textContent = `${summary.notSubmitted}명`;
  elements.submittedBadge.textContent = String(summary.submitted);
  elements.notSubmittedBadge.textContent = String(summary.notSubmitted);
  elements.meterFill.style.width = `${rate}%`;

  elements.submittedList.innerHTML = renderSubmitted(submitted);
  elements.notSubmittedList.innerHTML = renderMissing(notSubmitted);
}

function renderSubmitted(submitted) {
  if (!submitted.length) {
    return '<p class="empty">아직 제출된 글이 없어요.</p>';
  }

  return submitted
    .map(
      (member) => `
        <article class="person-card submitted-card">
          <div>
            <strong>${escapeHtml(member.name)}</strong>
            <span>@${escapeHtml(member.github || 'github 미연결')}</span>
          </div>
          <a href="${escapeHtml(member.url)}" target="_blank" rel="noreferrer">글 보러가기</a>
          <small>${formatDateTime(member.submittedAt)}</small>
        </article>
      `,
    )
    .join('');
}

function renderMissing(notSubmitted) {
  if (!notSubmitted.length) {
    return '<p class="empty success-text">모두 제출 완료했어요.</p>';
  }

  return notSubmitted
    .map(
      (member) => `
        <article class="person-card missing-card">
          <strong>${escapeHtml(member.name)}</strong>
          <span>@${escapeHtml(member.github || 'github 미연결')}</span>
        </article>
      `,
    )
    .join('');
}

elements.loadCurrentCycle.addEventListener('click', loadCurrentCycle);
elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  void loadCycleStatus();
});

void loadCycleStatus();
