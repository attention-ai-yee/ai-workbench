import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Circle,
  ListTodo,
  Loader2,
  Newspaper,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { greeting, relativeTime, formatDateTime } from "@/lib/time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const stats = trpc.tasks.stats.useQuery();
  const tasks = trpc.tasks.list.useQuery();
  const news = trpc.news.list.useQuery({ limit: 5 });
  const agents = trpc.agents.list.useQuery();

  const [quickTitle, setQuickTitle] = useState("");
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      setQuickTitle("");
      toast.success("事项已记录");
      void utils.tasks.invalidate();
    },
    onError: () => toast.error("记录失败，请重试"),
  });
  const toggleTask = trpc.tasks.update.useMutation({
    onSuccess: () => void utils.tasks.invalidate(),
  });

  const upcoming = (tasks.data ?? [])
    .filter((t) => t.status !== "done")
    .slice(0, 6);

  const today = new Date();
  const dateStr = `${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 欢迎区 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}，{user?.name ?? "朋友"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            今天是 {dateStr}，这是你工作台的全貌。
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/agents")}>
          <Sparkles className="mr-2 h-4 w-4" />
          问问 AI 助手
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<ListTodo className="h-5 w-5 text-blue-500" />}
          label="待办事项"
          value={stats.data?.todo}
          loading={stats.isLoading}
        />
        <StatCard
          icon={<Loader2 className="h-5 w-5 text-amber-500" />}
          label="进行中"
          value={stats.data?.doing}
          loading={stats.isLoading}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          label="已完成"
          value={stats.data?.done}
          loading={stats.isLoading}
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5 text-red-500" />}
          label="今日截止"
          value={stats.data?.dueToday}
          loading={stats.isLoading}
        />
      </div>

      {/* 快速记录 */}
      <Card>
        <CardContent className="flex gap-2 pt-6">
          <Input
            placeholder="快速记录一条事项，回车保存…"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && quickTitle.trim()) {
                createTask.mutate({ title: quickTitle.trim() });
              }
            }}
          />
          <Button
            disabled={!quickTitle.trim() || createTask.isPending}
            onClick={() => createTask.mutate({ title: quickTitle.trim() })}
          >
            <Plus className="mr-1 h-4 w-4" />
            记录
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 近期事项 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">近期事项</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tasks">
                全部 <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {tasks.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
            {!tasks.isLoading && upcoming.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                暂无待处理事项，去「事项」页添加，或让 AI 助手帮你记录。
              </p>
            )}
            {upcoming.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/60"
              >
                <button
                  onClick={() =>
                    toggleTask.mutate({ id: t.id, patch: { status: "done" } })
                  }
                  className="text-muted-foreground transition-colors hover:text-green-500"
                  aria-label="完成"
                >
                  <Circle className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  {t.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      截止 {formatDateTime(t.dueDate)}
                    </p>
                  )}
                </div>
                {t.priority === "high" && (
                  <Badge variant="destructive">紧急</Badge>
                )}
                {t.status === "doing" && (
                  <Badge variant="secondary">进行中</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 最新资讯 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper className="h-4 w-4" /> 最新资讯
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/news">
                全部 <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {news.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}
            {(news.data ?? []).map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/60"
              >
                <p className="line-clamp-1 text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {n.source} · {relativeTime(n.publishedAt)}
                </p>
              </a>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Agent 速览 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" /> 我的 Agent
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/agents">
              管理 <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(agents.data ?? []).slice(0, 3).map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/agents/${a.id}`)}
                className="flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <span className="text-2xl">{a.emoji}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {a.name}
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        a.status === "active" ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.focus || a.description || "点击开始对话"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
          {icon}
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{value ?? 0}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
