import { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleDot,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import type { Task } from "@contracts/types";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@contracts/types";
import { formatDateTime, relativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type TaskForm = {
  title: string;
  note: string;
  priority: Task["priority"];
  dueDate: string; // datetime-local
  tags: string;
};

const emptyForm: TaskForm = {
  title: "",
  note: "",
  priority: "medium",
  dueDate: "",
  tags: "",
};

function toDatetimeLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Tasks() {
  const utils = trpc.useUtils();
  const tasks = trpc.tasks.list.useQuery();

  const [filter, setFilter] = useState<"all" | Task["status"]>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);

  const invalidate = () => void utils.tasks.invalidate();

  const saveMutation = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("事项已创建");
      closeDialog();
      invalidate();
    },
    onError: () => toast.error("保存失败"),
  });
  const updateMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      closeDialog();
      invalidate();
    },
    onError: () => toast.error("保存失败"),
  });
  const deleteMutation = trpc.tasks.remove.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      invalidate();
    },
  });
  const toggleMutation = trpc.tasks.update.useMutation({
    onSuccess: invalidate,
  });

  const filtered = useMemo(() => {
    let list = tasks.data ?? [];
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.note ?? "").toLowerCase().includes(q) ||
          t.tags.toLowerCase().includes(q),
      );
    }
    // 未完成在前，按更新时间排序
    return [...list].sort((a, b) => {
      if ((a.status === "done") !== (b.status === "done"))
        return a.status === "done" ? 1 : -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [tasks.data, filter, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(t: Task) {
    setEditing(t);
    setForm({
      title: t.title,
      note: t.note ?? "",
      priority: t.priority,
      dueDate: toDatetimeLocal(t.dueDate),
      tags: t.tags,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function submit() {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      note: form.note.trim() || undefined,
      priority: form.priority,
      tags: form.tags.trim(),
      dueDate: form.dueDate ? new Date(form.dueDate) : null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, patch: payload });
    } else {
      saveMutation.mutate(payload);
    }
  }

  const counts = useMemo(() => {
    const all = tasks.data ?? [];
    return {
      all: all.length,
      todo: all.filter((t) => t.status === "todo").length,
      doing: all.filter((t) => t.status === "doing").length,
      done: all.filter((t) => t.status === "done").length,
    };
  }, [tasks.data]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">事项</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            记录待办、跟进进展，数据云端同步。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> 新建事项
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
        >
          <TabsList>
            <TabsTrigger value="all">全部 {counts.all}</TabsTrigger>
            <TabsTrigger value="todo">待办 {counts.todo}</TabsTrigger>
            <TabsTrigger value="doing">进行中 {counts.doing}</TabsTrigger>
            <TabsTrigger value="done">已完成 {counts.done}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索标题、备注或标签…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {tasks.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!tasks.isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-14 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {search || filter !== "all"
                ? "没有匹配的事项，换个条件试试。"
                : "还没有事项，点击「新建事项」开始记录吧。"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((t) => {
          const done = t.status === "done";
          return (
            <Card key={t.id} className={done ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-3 py-4">
                <button
                  className={`mt-0.5 shrink-0 transition-colors ${
                    done
                      ? "text-green-500"
                      : "text-muted-foreground hover:text-green-500"
                  }`}
                  onClick={() =>
                    toggleMutation.mutate({
                      id: t.id,
                      patch: { status: done ? "todo" : "done" },
                    })
                  }
                  aria-label={done ? "标记未完成" : "标记完成"}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`font-medium ${done ? "line-through" : ""}`}
                    >
                      {t.title}
                    </p>
                    <PriorityBadge priority={t.priority} />
                    {t.status === "doing" && (
                      <Badge variant="secondary">
                        <CircleDot className="mr-1 h-3 w-3" /> 进行中
                      </Badge>
                    )}
                  </div>
                  {t.note && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {t.note}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {t.dueDate && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        截止 {formatDateTime(t.dueDate)}
                      </span>
                    )}
                    {t.tags &&
                      t.tags
                        .split(/[,，]/)
                        .filter(Boolean)
                        .map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag.trim()}
                          </Badge>
                        ))}
                    <span className="ml-auto">
                      更新于 {relativeTime(t.updatedAt)}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {t.status !== "doing" && !done && (
                      <DropdownMenuItem
                        onClick={() =>
                          toggleMutation.mutate({
                            id: t.id,
                            patch: { status: "doing" },
                          })
                        }
                      >
                        <CircleDot className="mr-2 h-4 w-4" /> 开始处理
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => openEdit(t)}>
                      <Pencil className="mr-2 h-4 w-4" /> 编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: t.id })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> 删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 新建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "编辑事项" : "新建事项"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">标题</Label>
              <Input
                id="task-title"
                placeholder="要做什么？"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-note">备注</Label>
              <Textarea
                id="task-note"
                placeholder="补充细节（可选）"
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm({ ...form, priority: v as Task["priority"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">截止时间</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-tags">标签</Label>
              <Input
                id="task-tags"
                placeholder="用逗号分隔，如：工作, 学习"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button
              onClick={submit}
              disabled={
                !form.title.trim() ||
                saveMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editing ? "保存修改" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Task["priority"] }) {
  if (priority === "high")
    return <Badge variant="destructive">{TASK_PRIORITY_LABELS.high}优先级</Badge>;
  if (priority === "low")
    return <Badge variant="outline">{TASK_PRIORITY_LABELS.low}优先级</Badge>;
  return null;
}

export { TASK_STATUS_LABELS };
