// 前后端共享的类型（仅类型导入，编译期擦除）
import type {
  Agent,
  ChatMessage,
  ChatSession,
  NewsItem,
  Task,
  User,
} from "../db/schema";

export type { Agent, ChatMessage, ChatSession, NewsItem, Task, User };

export const TASK_STATUS_LABELS: Record<Task["status"], string> = {
  todo: "待办",
  doing: "进行中",
  done: "已完成",
};

export const TASK_PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};
