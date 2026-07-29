# AI 工作台

个人专属 AI 工作台：事项记录 · 资讯聚合 · AI Agent 中心（管理台 + 可对话助手）。

## 功能

- **事项**：新建/编辑/删除待办，优先级、截止时间、标签、状态流转，筛选与搜索
- **资讯**：聚合 36氪、机器之心、少数派、爱范儿、Hacker News，服务端每 20 分钟自动更新
- **Agent 中心**：创建/管理自定义 Agent（图标、专长、角色设定、启停），内置「工作台助手」可对话——帮你记录/查询/完成事项、汇总资讯、联网搜索回答问题
- **登录**：单用户访问令牌认证（无注册、无角色），会话 30 天有效

## 技术栈

- 前端：React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + react-router
- 后端：Hono + tRPC 11（端到端类型安全）
- 数据库：SQLite（better-sqlite3 + Drizzle ORM），内嵌部署、零依赖
- 部署：单容器 Dockerfile（前端构建 + 后端运行一体）

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `ACCESS_TOKEN` | 否 | `ai-workbench` | 登录访问令牌，**生产部署请务必修改** |
| `PORT` | 否 | `3000` | 服务端口 |
| `DATABASE_PATH` | 否 | `./data/app.db` | SQLite 数据库文件路径 |
| `KIMI_GW_API_KEY` | 否 | — | 助手联网搜索的网关密钥（不配则关闭联网问答，其余功能不受影响） |
| `KIMI_GW_BASE_URL` | 否 | agent-gw 默认地址 | 网关地址，一般无需设置 |

## 本地开发

```bash
npm install
npm run dev        # http://localhost:3000（前后端一体，HMR）
```

## 自行部署

### 方式一：Docker（推荐）

```bash
docker build -t ai-workbench .
docker run -d -p 3000:3000 \
  -e ACCESS_TOKEN=改成你的令牌 \
  -v ai-workbench-data:/app/data \
  --name ai-workbench \
  ai-workbench
```

访问 `http://服务器IP:3000`，输入令牌即可使用。数据库文件持久化在 `ai-workbench-data` 卷中。

### 方式二：直接运行（Node.js 20+）

```bash
npm ci
npm run build
ACCESS_TOKEN=改成你的令牌 npm start
```

数据默认保存在 `./data/app.db`，备份该文件即可备份全部数据。

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 构建前端 + 打包后端到 dist/ |
| `npm start` | 生产模式启动 |
| `npm run check` | TypeScript 类型检查 |

## 目录结构

```
api/            后端（Hono + tRPC）
  router.ts     路由注册
  migrate.ts    启动时自动建表
  services/     助手引擎、资讯抓取、联网搜索、令牌认证
  queries/      数据库访问层
db/schema.ts    Drizzle 表结构（唯一数据源定义）
contracts/      前后端共享类型与常量
src/            前端
  pages/        工作台 / 事项 / 资讯 / Agent 中心 / 对话 / 登录
  components/   布局与 UI 组件
Dockerfile      单容器部署
```
