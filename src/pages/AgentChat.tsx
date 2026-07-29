import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Markdown from "react-markdown";
import {
  ArrowLeft,
  Bot,
  Loader2,
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { relativeTime } from "@/lib/time";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTIONS = [
  "记一下 明天下午和产品组开会",
  "我今天有哪些事项？",
  "最新 AI 资讯有什么？",
  "你能做什么？",
];

export default function AgentChat() {
  const { id } = useParams<{ id: string }>();
  const agentId = Number(id);
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const agent = trpc.agents.get.useQuery(
    { id: agentId },
    { enabled: Number.isFinite(agentId) },
  );
  const sessions = trpc.chat.listSessions.useQuery();

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const agentSessions = useMemo(
    () => (sessions.data ?? []).filter((s) => s.agentId === agentId),
    [sessions.data, agentId],
  );

  const messages = trpc.chat.messages.useQuery(
    { sessionId: sessionId! },
    { enabled: sessionId !== null },
  );

  const createSession = trpc.chat.createSession.useMutation();
  const sendMessage = trpc.chat.send.useMutation();
  const removeSession = trpc.chat.removeSession.useMutation({
    onSuccess: () => {
      setSessionId(null);
      void utils.chat.listSessions.invalidate();
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length, sending]);

  async function send(content: string) {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      let sid = sessionId;
      if (sid === null) {
        const created = await createSession.mutateAsync({ agentId });
        sid = created.id;
        setSessionId(sid);
      }
      await sendMessage.mutateAsync({ sessionId: sid, agentId, content: text });
      await utils.chat.messages.invalidate({ sessionId: sid });
      await utils.chat.listSessions.invalidate();
      await utils.tasks.invalidate(); // 助手可能改动了事项
    } catch {
      toast.error("发送失败，请重试");
    } finally {
      setSending(false);
    }
  }

  if (agent.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  if (!agent.data) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Agent 不存在或已被删除。</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/agents")}>
          返回 Agent 中心
        </Button>
      </div>
    );
  }

  const a = agent.data;

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      {/* 会话列表 */}
      <aside
        className={`shrink-0 flex-col rounded-xl border bg-card shadow-sm transition-all duration-200 md:flex ${
          sessionsOpen
            ? "w-56 opacity-100"
            : "w-0 opacity-0 border-0"
        }`}
      >
        <div className="border-b p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setSessionId(null)}
          >
            <MessageSquarePlus className="mr-1.5 h-4 w-4" /> 新对话
          </Button>
        </div>
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="space-y-1 p-2">
            {agentSessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors ${
                  sessionId === s.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                }`}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSessionId(s.id)}
                >
                  <p className="truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {relativeTime(s.updatedAt)}
                  </p>
                </button>
                <button
                  className="hidden shrink-0 text-muted-foreground hover:text-destructive group-hover:block"
                  onClick={() => removeSession.mutate({ id: s.id })}
                  aria-label="删除会话"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {agentSessions.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                暂无历史会话
              </p>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* 聊天主区 */}
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border bg-card">
        {/* 头部 */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/agents")}
            aria-label="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setSessionsOpen((v) => !v)}
            aria-label={sessionsOpen ? "收起会话列表" : "展开会话列表"}
          >
            {sessionsOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          <span className="text-2xl">{a.emoji}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{a.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {a.focus || a.description || "AI 助手"}
            </p>
          </div>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
              a.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                a.status === "active" ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            {a.status === "active" ? "在线" : "已暂停"}
          </span>
        </div>

        {/* 消息区 */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-5 py-5">
            {sessionId === null && (
              <div className="mx-auto max-w-lg py-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
                  {a.emoji}
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  你好，我是{a.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.description ?? "有什么可以帮你的？"}
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="rounded-xl border px-3 py-2.5 text-left text-sm transition-all hover:border-primary/50 hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.isLoading && sessionId !== null && (
              <div className="space-y-3">
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="ml-auto h-12 w-1/2" />
              </div>
            )}

            {(messages.data ?? []).map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                emoji={a.emoji}
              />
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-base">
                    {a.emoji}
                  </AvatarFallback>
                </Avatar>
                <Loader2 className="h-4 w-4 animate-spin" />
                正在思考…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* 输入区 */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder={`发消息给${a.name}…（Enter 发送，Shift+Enter 换行）`}
              className="min-h-[44px] max-h-40 resize-none"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={!input.trim() || sending || a.status !== "active"}
              onClick={() => void send(input)}
              aria-label="发送"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 px-1 text-xs text-muted-foreground">
            <Bot className="h-3 w-3" />
            助手可帮你记录事项、查询待办、汇总资讯并联网检索回答
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  emoji,
}: {
  role: "user" | "assistant";
  content: string;
  emoji: string;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-base">
          {emoji}
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-accent/70 px-4 py-2.5 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
        <Markdown
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {content}
        </Markdown>
      </div>
    </div>
  );
}
