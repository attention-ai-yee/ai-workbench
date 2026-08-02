import { useMemo, useState } from "react";
import { ExternalLink, Newspaper, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { relativeTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SOURCE_COLORS: Record<string, string> = {
  "36氪": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  机器之心: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  少数派: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  爱范儿: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "Hacker News": "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
};

export default function News() {
  const utils = trpc.useUtils();
  const news = trpc.news.list.useQuery({ limit: 100 });
  const [category, setCategory] = useState<"all" | "AI" | "科技">("all");
  const [search, setSearch] = useState("");

  const refresh = trpc.news.refresh.useMutation({
    onSuccess: (res) => {
      toast.success(`已更新，共抓取 ${res.count} 条资讯`);
      void utils.news.invalidate();
    },
    onError: () => toast.error("刷新失败，请稍后再试"),
  });

  const filtered = useMemo(() => {
    let list = news.data ?? [];
    if (category !== "all") list = list.filter((n) => n.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.summary ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [news.data, category, search]);

  const sources = useMemo(
    () => Array.from(new Set((news.data ?? []).map((n) => n.source))),
    [news.data],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">资讯</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            聚合 36氪、机器之心、少数派、爱范儿、Hacker News 等来源，每 20
            分钟自动更新。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="sm:size-default"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`}
          />
          {refresh.isPending ? "正在抓取…" : "立即刷新"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={category}
          onValueChange={(v) => setCategory(v as typeof category)}
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" className="flex-1 sm:flex-none">全部</TabsTrigger>
            <TabsTrigger value="AI" className="flex-1 sm:flex-none">AI</TabsTrigger>
            <TabsTrigger value="科技" className="flex-1 sm:flex-none">科技</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索资讯…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {news.isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!news.isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-14 text-center">
            <Newspaper className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              暂无资讯，点击右上角「立即刷新」抓取最新内容。
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {filtered.map((n) => (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noreferrer"
            className="group -mx-1 sm:mx-0"
          >
            <Card className="h-full border-transparent transition-all group-hover:border-primary/40 group-hover:shadow-md sm:border-border">
              <CardContent className="flex h-full flex-col p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      SOURCE_COLORS[n.source] ??
                      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {n.source}
                  </span>
                  <Badge variant="outline" className="text-xs">{n.category}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {relativeTime(n.publishedAt)}
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-2 font-medium leading-snug group-hover:text-primary">
                  {n.title}
                </h3>
                {n.summary && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {n.summary}
                  </p>
                )}
                {/* 移动端常显「阅读原文」，桌面端 hover 显示 */}
                <div className="mt-auto pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                    阅读原文 <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {sources.length > 0 && (
        <p className="pt-2 text-center text-xs text-muted-foreground">
          数据来源：{sources.join(" · ")}，内容版权归原网站所有
        </p>
      )}
    </div>
  );
}
