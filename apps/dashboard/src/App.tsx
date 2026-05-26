import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Megaphone,
  RefreshCw,
  Search,
  UsersRound,
} from 'lucide-react';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Progress } from './components/ui/progress';
import { Separator } from './components/ui/separator';

const API_BASE_URL = '';

type Cycle = {
  id: number;
  week: number;
  startDate: string;
  endDate: string;
  generationName: string;
  organizationSlug: string;
};

type SubmittedMember = {
  name: string;
  github?: string;
  url: string;
  submittedAt?: string;
};

type MissingMember = {
  name: string;
  github?: string;
};

type CycleStatus = {
  cycle: Cycle;
  summary: {
    total: number;
    submitted: number;
    notSubmitted: number;
  };
  submitted: SubmittedMember[];
  notSubmitted: MissingMember[];
};

type CurrentCycle = Pick<Cycle, 'id' | 'week' | 'generationName' | 'organizationSlug'>;

type ApiState = 'idle' | 'loading' | 'connected' | 'error';

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function formatCycleLabel(cycle?: Pick<Cycle, 'generationName' | 'week'>) {
  if (!cycle) return '조회 전';
  return `${cycle.generationName} ${cycle.week}주차`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((payload as { error?: string }).error ?? `HTTP ${response.status}`);
  }

  return payload as T;
}

function getRate(status?: CycleStatus) {
  if (!status || status.summary.total === 0) return 0;
  return Math.round((status.summary.submitted / status.summary.total) * 100);
}

export function App() {
  const [organizationSlug, setOrganizationSlug] = useState('donguel-donguel');
  const [cycleId, setCycleId] = useState('11');
  const [apiState, setApiState] = useState<ApiState>('idle');
  const [status, setStatus] = useState<CycleStatus | null>(null);
  const [message, setMessage] = useState('조회 전입니다. 먼저 현재 회차를 불러오거나 회차 ID로 제출 현황을 확인하세요.');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const submissionRate = getRate(status ?? undefined);
  const hasMissing = (status?.summary.notSubmitted ?? 0) > 0;
  const riskLabel = !status
    ? '대기'
    : hasMissing
      ? `${status.summary.notSubmitted}명 리마인드 필요`
      : '전원 제출 완료';

  const operatorFocus = useMemo(() => {
    if (!status) {
      return [
        '현재 회차 불러오기 버튼으로 운영 중인 회차를 확인하세요.',
        '회차 ID가 다르면 직접 입력 후 제출 현황 새로고침을 누르세요.',
        'Discord /submit 안내를 스터디원에게 공유하세요.',
      ];
    }

    if (hasMissing) {
      return [
        '미제출 먼저 확인: 오른쪽 목록에서 GitHub 미연결 여부를 같이 봅니다.',
        '미제출자에게 리마인드: Discord에서 /submit url: 링크 제출을 안내합니다.',
        '제출률 추이: 새로고침 후 제출률이 올라가는지 확인합니다.',
      ];
    }

    return [
      '모두 제출했습니다. 제출한 글 링크가 열리는지 샘플 확인하세요.',
      '다음 회차가 열렸다면 현재 회차 불러오기로 운영 범위를 다시 확인하세요.',
      '회고/리뷰 운영 액션이 있으면 Discord 공지로 이어가세요.',
    ];
  }, [hasMissing, status]);

  async function loadCycleStatus(nextCycleId = cycleId) {
    if (!/^\d+$/.test(nextCycleId.trim())) {
      setApiState('error');
      setMessage('회차 ID는 숫자로 입력해주세요.');
      return;
    }

    setApiState('loading');
    setMessage('제출 현황을 불러오는 중입니다.');

    try {
      const encodedSlug = encodeURIComponent(organizationSlug.trim() || 'donguel-donguel');
      const cycleStatus = await fetchJson<CycleStatus>(`/api/status/${nextCycleId.trim()}?organizationSlug=${encodedSlug}`);
      setStatus(cycleStatus);
      setCycleId(String(cycleStatus.cycle.id));
      setApiState('connected');
      setLastUpdatedAt(new Date().toISOString());
      setMessage('제출 현황을 업데이트했습니다.');
    } catch (error) {
      setApiState('error');
      setMessage(`제출 현황을 불러오지 못했습니다: ${(error as Error).message}`);
    }
  }

  async function loadCurrentCycle() {
    setApiState('loading');
    setMessage('현재 운영 회차를 확인하는 중입니다.');

    try {
      const encodedSlug = encodeURIComponent(organizationSlug.trim() || 'donguel-donguel');
      const current = await fetchJson<CurrentCycle>(`/api/status/current?organizationSlug=${encodedSlug}`);
      setCycleId(String(current.id));
      await loadCycleStatus(String(current.id));
    } catch (error) {
      setApiState('error');
      setMessage(`현재 회차를 불러오지 못했습니다: ${(error as Error).message}`);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadCycleStatus();
  }

  useEffect(() => {
    void loadCycleStatus('11');
    // initial MVP default only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 text-foreground lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-border bg-card/70 p-5 shadow-2xl backdrop-blur lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Study Admin</p>
              <h1 className="text-xl font-black tracking-tight">똥글똥글 어드민</h1>
            </div>
          </div>

          <nav className="grid gap-2 text-sm text-muted-foreground">
            <a className="rounded-xl bg-secondary px-3 py-2 font-semibold text-foreground" href="#overview">운영자가 지금 봐야 할 것</a>
            <a className="rounded-xl px-3 py-2 hover:bg-secondary" href="#missing">미제출 먼저 확인</a>
            <a className="rounded-xl px-3 py-2 hover:bg-secondary" href="#submissions">제출 글 링크</a>
            <a className="rounded-xl px-3 py-2 hover:bg-secondary" href="#actions">운영 액션</a>
          </nav>

          <Separator className="my-6" />

          <div className="space-y-3 rounded-2xl border border-border bg-background/40 p-4">
            <p className="text-sm font-semibold text-muted-foreground">현재 조회</p>
            <p className="text-lg font-bold">{formatCycleLabel(status?.cycle)}</p>
            <Badge variant={apiState === 'connected' ? 'success' : apiState === 'error' ? 'destructive' : 'secondary'}>
              API {apiState === 'loading' ? '불러오는 중' : apiState === 'connected' ? '연결됨' : apiState === 'error' ? '오류' : '대기'}
            </Badge>
          </div>
        </aside>

        <main className="space-y-6">
          <section id="overview" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="overflow-hidden bg-card/80 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge variant="outline">운영자가 지금 봐야 할 것</Badge>
                    <CardTitle className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                      무엇을 봐야 하는지 바로 보이게 정리했습니다
                    </CardTitle>
                    <CardDescription className="mt-3 text-base">
                      제출률, 미제출자, 다음 운영 액션을 한 화면에서 먼저 보여주는 shadcn 기반 어드민 서비스입니다.
                    </CardDescription>
                  </div>
                  <Badge variant={hasMissing ? 'warning' : 'success'} className="text-sm">
                    {riskLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <MetricCard label="제출률 추이" value={`${submissionRate}%`} icon={<Gauge className="h-5 w-5" />} />
                  <MetricCard label="제출" value={`${status?.summary.submitted ?? 0} / ${status?.summary.total ?? 0}`} icon={<CheckCircle2 className="h-5 w-5" />} />
                  <MetricCard label="미제출" value={`${status?.summary.notSubmitted ?? 0}명`} icon={<UsersRound className="h-5 w-5" />} tone="warning" />
                </div>
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatCycleLabel(status?.cycle)}</span>
                    <span>{lastUpdatedAt ? formatDateTime(lastUpdatedAt) : '업데이트 전'}</span>
                  </div>
                  <Progress value={submissionRate} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> 조회 조건</CardTitle>
                <CardDescription>현재 회차를 먼저 불러오고, 필요하면 회차 ID로 직접 조회하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
                    스터디 slug
                    <Input value={organizationSlug} onChange={(event) => setOrganizationSlug(event.target.value)} />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-muted-foreground">
                    회차 ID
                    <Input value={cycleId} inputMode="numeric" onChange={(event) => setCycleId(event.target.value)} />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="secondary" onClick={() => void loadCurrentCycle()}>
                      <RefreshCw className="h-4 w-4" /> 현재 회차 불러오기
                    </Button>
                    <Button type="submit">
                      <RefreshCw className="h-4 w-4" /> 제출 현황 새로고침
                    </Button>
                  </div>
                </form>
                <p className="mt-4 rounded-xl border border-border bg-background/50 p-3 text-sm text-muted-foreground">{message}</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card id="missing" className="bg-card/80 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>미제출 먼저 확인</CardTitle>
                    <CardDescription>운영자가 가장 먼저 봐야 하는 리스크 목록입니다.</CardDescription>
                  </div>
                  <Badge variant={hasMissing ? 'warning' : 'success'}>{status?.summary.notSubmitted ?? 0}명</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {status?.notSubmitted.length ? (
                  status.notSubmitted.map((member) => (
                    <div key={`${member.name}-${member.github}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/40 p-4">
                      <div>
                        <p className="font-bold">{member.name}</p>
                        <p className="text-sm text-muted-foreground">@{member.github || 'github 미연결'}</p>
                      </div>
                      <Badge variant={member.github ? 'warning' : 'destructive'}>{member.github ? '리마인드' : 'GitHub 확인'}</Badge>
                    </div>
                  ))
                ) : (
                  <EmptyState title="미제출자가 없습니다" description="모두 제출 완료했어요." />
                )}
              </CardContent>
            </Card>

            <Card id="actions" className="bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> 운영 액션</CardTitle>
                <CardDescription>다음 행동을 고민하지 않게 순서대로 보여줍니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {operatorFocus.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-border bg-background/40 p-4">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
                <Separator />
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <p className="font-bold text-cyan-100">Discord /submit 안내</p>
                  <p className="mt-2 text-sm text-cyan-100/80">스터디원은 Discord에서 <code className="rounded bg-background/70 px-1 py-0.5">/submit url:블로그주소</code> 로 제출합니다.</p>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href="https://discord.com/channels/1416659264038244455" target="_blank" rel="noreferrer">
                    Discord 열기 <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </section>

          <Card id="submissions" className="bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>제출한 글</CardTitle>
              <CardDescription>글 링크와 제출 시간을 바로 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {status?.submitted.length ? (
                status.submitted.map((member) => (
                  <a key={`${member.name}-${member.url}`} href={member.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-border bg-background/40 p-4 transition hover:border-cyan-300/60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">{member.name}</p>
                        <p className="text-sm text-muted-foreground">@{member.github || 'github 미연결'}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-3 truncate text-sm text-cyan-100">{member.url}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(member.submittedAt)}</p>
                  </a>
                ))
              ) : (
                <div className="md:col-span-2">
                  <EmptyState title="아직 제출된 글이 없습니다" description="미제출자에게 /submit url: 제출을 안내하세요." />
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, tone = 'default' }: { label: string; value: string; icon: React.ReactNode; tone?: 'default' | 'warning' }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-4">
      <div className={tone === 'warning' ? 'text-amber-200' : 'text-cyan-200'}>{icon}</div>
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/30 p-6 text-center">
      <AlertCircle className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
