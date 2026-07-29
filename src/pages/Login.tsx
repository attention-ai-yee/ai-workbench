import { useState } from "react";
import { useNavigate } from "react-router";
import { KeyRound, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";

export default function Login() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [token, setToken] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      navigate("/", { replace: true });
    },
    onError: (e) => toast.error(e.message ?? "登录失败，请重试"),
  });

  function submit() {
    if (!token.trim() || login.isPending) return;
    login.mutate({ token: token.trim() });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-background to-violet-50 p-4 dark:from-indigo-950/30 dark:to-violet-950/30">
      <Toaster richColors position="top-center" />
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">AI 工作台</CardTitle>
          <CardDescription>
            记录事项 · 聚合资讯 · 与 AI 助手协作
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="token">访问令牌</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="token"
                type="password"
                className="pl-9"
                placeholder="输入你的访问令牌"
                value={token}
                autoComplete="current-password"
                autoFocus
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!token.trim() || login.isPending}
            onClick={submit}
          >
            {login.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            进入工作台
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            个人专属工作台，数据云端保存、多设备同步
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
