import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpenText, CheckCircle2, Clock3, Compass, LogIn, Search, Sparkles } from 'lucide-react';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Separator } from './components/ui/separator';

const API_BASE_URL = '';

type Study = {
  id: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  currentCycle: null | {
    id: number;
    week: number;
    generationName: string;
    startDate: string;
    endDate: string;
    submissionCount: number;
  };
};

type AuthUser = {
  id: string;
  username?: string;
  globalName?: string;
  avatar?: string;
};

type AuthSession = {
  authenticated: boolean;
  user: AuthUser | null;
  oauthConfigured?: boolean;
};

type MySubmissionStatus = {
  organizationSlug: string;
  cycleId: number | null;
  status: 'SUBMITTED' | 'NOT_SUBMITTED' | 'NO_CURRENT_CYCLE';
  submission?: { title: string; url: string } | null;
};

type MyStudiesResponse = {
  user: null | {
    id: number;
    name: string;
    githubUsername?: string;
    discordUsername?: string;
  };
  studies: Study[];
  mySubmissionStatus?: MySubmissionStatus[];
  message?: string;
};

type CycleStatus = {
  cycle: {
    id: number;
    week: number;
    generationName: string;
    organizationSlug: string;
  };
  submitted: Array<{
    name: string;
    github?: string;
    title?: string;
    url: string;
    submittedAt?: string;
  }>;
};

type ApiState = 'idle' | 'loading' | 'ready' | 'error';

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

function formatDate(value?: string) {
  if (!value) return '일정 미정';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function formatAuthor(member: { name: string; github?: string }) {
  return member.github ? `${member.name} @${member.github}` : member.name;
}

function getSubmissionTitle(submission: { title?: string; url: string }) {
  return submission.title?.trim() || submission.url;
}

function getMyStatus(statuses: MySubmissionStatus[] | undefined, study: Study) {
  return statuses?.find((status) => status.organizationSlug === study.slug);
}

function getStatusLabel(status?: MySubmissionStatus) {
  if (!status) return '로그인하면 내 제출 상태 확인';
  if (status.status === 'SUBMITTED') return '제출 완료';
  if (status.status === 'NO_CURRENT_CYCLE') return '진행 중인 회차 없음';
  return '아직 제출 전';
}

export function App() {
  const [query, setQuery] = useState('');
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [publicStudies, setPublicStudies] = useState<Study[]>([]);
  const [myStudies, setMyStudies] = useState<Study[]>([]);
  const [mySubmissionStatus, setMySubmissionStatus] = useState<MySubmissionStatus[]>([]);
  const [auth, setAuth] = useState<AuthSession>({ authenticated: false, user: null });
  const [cycleStatus, setCycleStatus] = useState<CycleStatus | null>(null);
  const [apiState, setApiState] = useState<ApiState>('idle');
  const [message, setMessage] = useState('스터디를 불러오는 중입니다.');

  const visibleStudies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return publicStudies;
    return publicStudies.filter((study) =>
      `${study.name} ${study.slug} ${study.description}`.toLowerCase().includes(normalized),
    );
  }, [publicStudies, query]);

  async function loadPortal() {
    setApiState('loading');
    setMessage('스터디 탐색 정보를 불러오는 중입니다.');

    try {
      const [authSession, studiesResponse, myResponse] = await Promise.all([
        fetchJson<AuthSession>('/api/auth/me'),
        fetchJson<{ studies: Study[] }>('/api/studies'),
        fetchJson<MyStudiesResponse>('/api/studies/me'),
      ]);

      setAuth(authSession);
      setPublicStudies(studiesResponse.studies);
      setMyStudies(myResponse.studies ?? []);
      setMySubmissionStatus(myResponse.mySubmissionStatus ?? []);
      const initialStudy = myResponse.studies?.[0] ?? studiesResponse.studies[0] ?? null;
      setSelectedStudy((current) => current ?? initialStudy);
      setApiState('ready');
      if (initialStudy?.currentCycle) {
        void loadSubmissions(initialStudy);
      } else {
        setMessage(myResponse.message ?? '스터디를 불러왔습니다.');
      }
    } catch (error) {
      setApiState('error');
      setMessage(`스터디 정보를 불러오지 못했습니다: ${(error as Error).message}`);
    }
  }

  async function loadSubmissions(study: Study) {
    setSelectedStudy(study);
    setCycleStatus(null);

    if (!study.currentCycle) {
      setMessage('이 스터디는 아직 진행 중인 회차가 없습니다.');
      return;
    }

    try {
      const cycleId = study.currentCycle.id;
      const status = await fetchJson<CycleStatus>(`/api/status/${cycleId}?organizationSlug=${encodeURIComponent(study.slug)}`);
      setCycleStatus({
        ...status,
        submitted: status.submitted.map((submission) => ({
          ...submission,
          title: submission.title ?? submission.url,
        })),
      });
      setMessage('제출글 모아보기를 업데이트했습니다.');
    } catch (error) {
      setMessage(`제출글을 불러오지 못했습니다: ${(error as Error).message}`);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  useEffect(() => {
    void loadPortal();
  }, []);

  const selectedMyStatus = selectedStudy ? getMyStatus(mySubmissionStatus, selectedStudy) : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Study Explorer</p>
              <h1 className="text-lg font-black">스터디 탐색</h1>
            </div>
          </div>

          <form onSubmit={handleSearch} className="hidden flex-1 justify-center md:flex">
            <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-border bg-white px-5 py-2 shadow-airbnb">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                placeholder="스터디 이름이나 설명으로 검색"
              />
            </div>
          </form>

          {auth.authenticated ? (
            <Button variant="outline" asChild>
              <a href="/api/auth/logout">로그아웃</a>
            </Button>
          ) : auth.oauthConfigured === false ? (
            <Button variant="outline" disabled>
              OAuth 설정 필요
            </Button>
          ) : (
            <Button asChild>
              <a href="/api/auth/discord/login"><LogIn className="h-4 w-4" /> Discord로 로그인</a>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-5 py-8">
        <section className="rounded-[2rem] border border-border bg-gradient-to-br from-white to-rose-50 p-8 shadow-airbnb md:p-12">
          <Badge variant="outline" className="border-primary/30 text-primary">공개 조회 + 로그인 개인화</Badge>
          <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
            여러 스터디의 제출글을 한곳에서 모아보세요
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            누구나 공개 스터디와 제출글을 볼 수 있고, Discord로 로그인하면 내 스터디와 내 제출 상태가 먼저 보여요.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">Airbnb 참고 화이트 테마</Badge>
            <Badge variant="secondary">제출글 모아보기</Badge>
            <Badge variant="secondary">내 제출 상태</Badge>
            <Badge variant="secondary">제목이 없으면 URL</Badge>
            <Badge variant="secondary">예: 박준형 @bbakjun</Badge>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black">내 스터디</h3>
                  <p className="mt-1 text-sm text-muted-foreground">로그인한 유저에게는 내가 참여 중인 스터디를 먼저 보여줍니다.</p>
                </div>
                {!auth.authenticated && <Badge variant="outline">로그인하면 내 제출 상태 표시</Badge>}
              </div>

              {auth.authenticated && myStudies.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {myStudies.map((study) => (
                    <StudyCard
                      key={study.slug}
                      study={study}
                      myStatus={getMyStatus(mySubmissionStatus, study)}
                      onOpen={() => void loadSubmissions(study)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed bg-secondary/50">
                  <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold">Discord로 로그인하면 내 스터디와 내 제출 상태를 볼 수 있어요.</p>
                      <p className="mt-1 text-sm text-muted-foreground">등록되지 않은 경우 스터디봇에서 /member create를 먼저 진행하면 됩니다.</p>
                    </div>
                    {auth.oauthConfigured === false ? (
                      <Button disabled variant="outline">
                        Discord OAuth 설정 필요
                      </Button>
                    ) : (
                      <Button asChild>
                        <a href="/api/auth/discord/login">Discord로 로그인 <ArrowRight className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black">전체 공개 스터디</h3>
                  <p className="mt-1 text-sm text-muted-foreground">스터디 이름과 설명으로 검색하고 회차별 제출글을 볼 수 있습니다.</p>
                </div>
                <Badge variant={apiState === 'error' ? 'destructive' : 'secondary'}>{apiState}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleStudies.map((study) => (
                  <StudyCard
                    key={study.slug}
                    study={study}
                    myStatus={getMyStatus(mySubmissionStatus, study)}
                    onOpen={() => void loadSubmissions(study)}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <Card className="shadow-airbnb">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> 내 제출 상태</CardTitle>
                <CardDescription>현재 선택한 스터디의 현재 회차 기준입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-sm text-muted-foreground">선택한 스터디</p>
                  <p className="mt-1 text-xl font-black">{selectedStudy?.name ?? '스터디 선택 전'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedStudy?.currentCycle
                      ? `${selectedStudy.currentCycle.generationName} ${selectedStudy.currentCycle.week}주차`
                      : '진행 중인 회차 없음'}
                  </p>
                </div>

                <div className="rounded-2xl border border-border p-4">
                  <Badge variant={selectedMyStatus?.status === 'SUBMITTED' ? 'success' : 'warning'}>
                    {getStatusLabel(selectedMyStatus)}
                  </Badge>
                  {selectedMyStatus?.status === 'SUBMITTED' && selectedMyStatus.submission ? (
                    <a className="mt-3 block font-bold hover:underline" href={selectedMyStatus.submission.url} target="_blank" rel="noreferrer">
                      {selectedMyStatus.submission.title} <ArrowUpRight className="inline h-4 w-4" />
                    </a>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      제출은 우선 Discord에서 <code className="rounded bg-secondary px-1 py-0.5">/submit url:https://your-blog.com/post</code> 로 진행해주세요.
                    </p>
                  )}
                </div>

                <p className="rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-700">{message}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpenText className="h-5 w-5" /> 제출글 모아보기</CardTitle>
                <CardDescription>회차별 제출글을 공개 목록으로 보여줍니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {cycleStatus?.submitted.length ? (
                  cycleStatus.submitted.map((submission) => (
                    <a key={`${submission.name}-${submission.url}`} href={submission.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-border p-4 transition hover:-translate-y-0.5 hover:shadow-airbnb">
                      <p className="font-bold">{getSubmissionTitle(submission)}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{formatAuthor(submission)}</p>
                    </a>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    아직 제출된 글이 없거나 스터디를 선택하지 않았습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
    </div>
  );
}

function StudyCard({ study, myStatus, onOpen }: { study: Study; myStatus?: MySubmissionStatus; onOpen: () => void }) {
  return (
    <Card className="group cursor-pointer rounded-[1.75rem] transition hover:-translate-y-1 hover:shadow-airbnb" onClick={onOpen}>
      <CardHeader>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-primary">
          <BookOpenText className="h-6 w-6" />
        </div>
        <CardTitle>{study.name}</CardTitle>
        <CardDescription>{study.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            <Clock3 className="mr-1 h-3 w-3" />
            {study.currentCycle ? `${study.currentCycle.generationName} ${study.currentCycle.week}주차` : '회차 준비 중'}
          </Badge>
          <Badge variant={myStatus?.status === 'SUBMITTED' ? 'success' : 'outline'}>{getStatusLabel(myStatus)}</Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">이번 회차 제출글</span>
          <span className="font-bold">{study.currentCycle?.submissionCount ?? 0}개</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">일정</span>
          <span className="font-bold">{formatDate(study.currentCycle?.startDate)} - {formatDate(study.currentCycle?.endDate)}</span>
        </div>
        <Button className="w-full rounded-full" variant="outline" type="button">
          제출글 보기 <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
