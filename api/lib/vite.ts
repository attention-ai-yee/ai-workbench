import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

// 部署在子路径 /ai-workbench/ 下时，剥离前缀后再交给静态文件中间件。
const BASE = "/ai-workbench";

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  app.use(
    `${BASE}/*`,
    serveStatic({
      root: "./dist/public",
      rewriteRequestPath: (reqPath) => {
        // reqPath 形如 /ai-workbench/assets/x.js -> /assets/x.js
        if (reqPath.startsWith(BASE)) {
          return reqPath.slice(BASE.length) || "/";
        }
        return reqPath;
      },
    }),
  );

  // 根路径访问 /ai-workbench 或 /ai-workbench/ 时返回 index.html
  app.get(`${BASE}`, (c) => {
    const content = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
    return c.html(content);
  });

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    // 仅对本应用子路径下的 HTML 请求做 SPA fallback
    const url = new URL(c.req.url);
    if (!url.pathname.startsWith(BASE)) {
      return c.json({ error: "Not Found" }, 404);
    }
    const content = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
    return c.html(content);
  });
}
