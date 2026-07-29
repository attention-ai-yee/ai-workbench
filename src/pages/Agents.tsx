import { useState } from "react";
import { useNavigate } from "react-router";
import { Bot, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import type { Agent } from "@contracts/types";
import { relativeTime } from "@/lib/time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const EMOJI_OPTIONS = ["🤖", "🧠", "📊", "✍️", "🔍", "💼", "🎯", "🚀", "📚", "🛠️", "💡", "🎨"];

type AgentForm = {
  name: string;
  emoji: string;
  focus: string;
  description: string;
  systemPrompt: string;
};

const emptyForm: AgentForm = {
  name: "",
  emoji: "🤖",
  focus: "",
  description: "",
  systemPrompt: "",
};

export default function Agents() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const agents = trpc.agents.list.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState<AgentForm>(emptyForm);
  const [deleting, setDeleting] = useState<Agent | null>(null);

  const invalidate = () => void utils.agents.invalidate();

  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success("Agent 已创建");
      closeDialog();
      invalidate();
    },
    onError: () => toast.error("创建失败"),
  });
  const updateMutation = trpc.agents.update.useMutation({
    onSuccess: () => {
      toast.success("已保存");
      closeDialog();
      invalidate();
    },
    onError: () => toast.error("保存失败"),
  });
  const toggleMutation = trpc.agents.toggle.useMutation({
    onSuccess: (res) => {
      toast.success(res.status === "active" ? "已启用" : "已暂停");
      invalidate();
    },
  });
  const deleteMutation = trpc.agents.remove.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      setDeleting(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message || "删除失败"),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(a: Agent) {
    setEditing(a);
    setForm({
      name: a.name,
      emoji: a.emoji,
      focus: a.focus,
      description: a.description ?? "",
      systemPrompt: a.systemPrompt ?? "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function submit() {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      emoji: form.emoji,
      focus: form.focus.trim(),
      description: form.description.trim() || undefined,
      systemPrompt: form.systemPrompt.trim() || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, patch: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent 中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            创建和管理你的 AI 助手，点击卡片即可开始对话。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> 新建 Agent
        </Button>
      </div>

      {agents.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(agents.data ?? []).map((a) => (
          <Card key={a.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <span className="text-3xl">{a.emoji}</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={a.status === "active" ? "default" : "secondary"}
                  >
                    {a.status === "active" ? "运行中" : "已暂停"}
                  </Badge>
                  <Switch
                    checked={a.status === "active"}
                    onCheckedChange={() => toggleMutation.mutate({ id: a.id })}
                    aria-label="启用/暂停"
                  />
                </div>
              </div>
              <div className="pt-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  {a.name}
                  {a.isBuiltin && (
                    <Badge variant="outline" className="text-xs">
                      内置
                    </Badge>
                  )}
                </h3>
                {a.focus && (
                  <p className="mt-0.5 text-xs text-primary/80">{a.focus}</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {a.description || "暂无描述"}
              </p>
            </CardContent>
            <CardFooter className="flex items-center gap-2 border-t pt-3">
              <Button
                size="sm"
                className="flex-1"
                disabled={a.status !== "active"}
                onClick={() => navigate(`/agents/${a.id}`)}
              >
                <MessageSquare className="mr-1.5 h-4 w-4" /> 对话
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(a)}
                aria-label="编辑"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {!a.isBuiltin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(a)}
                  aria-label="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {relativeTime(a.createdAt)}创建
              </span>
            </CardFooter>
          </Card>
        ))}
      </div>

      {!agents.isLoading && (agents.data ?? []).length === 0 && (
        <Card>
          <CardContent className="py-14 text-center">
            <Bot className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              还没有 Agent，点击「新建 Agent」创建一个吧。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 新建/编辑 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "编辑 Agent" : "新建 Agent"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[auto_1fr] items-end gap-4">
              <div className="space-y-2">
                <Label>图标</Label>
                <div className="grid max-w-[168px] grid-cols-6 gap-1">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setForm({ ...form, emoji: e })}
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors ${
                        form.emoji === e
                          ? "bg-primary/15 ring-1 ring-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-name">名称</Label>
                <Input
                  id="agent-name"
                  placeholder="例如：投研助手"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-focus">专长领域</Label>
              <Input
                id="agent-focus"
                placeholder="例如：财经资讯分析、英语学习、代码评审"
                value={form.focus}
                onChange={(e) => setForm({ ...form, focus: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-desc">描述</Label>
              <Textarea
                id="agent-desc"
                placeholder="这个 Agent 是做什么的？"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-prompt">角色设定（System Prompt）</Label>
              <Textarea
                id="agent-prompt"
                placeholder="定义它的身份、语气和行为准则…"
                rows={3}
                value={form.systemPrompt}
                onChange={(e) =>
                  setForm({ ...form, systemPrompt: e.target.value })
                }
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
                !form.name.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editing ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Agent「{deleting?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后不可恢复，相关对话记录仍保留在其他会话中。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleting && deleteMutation.mutate({ id: deleting.id })
              }
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
