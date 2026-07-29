import * as cookie from "cookie";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { Session } from "@contracts/constants";
import type { User } from "@db/schema";
import { findSessionUser } from "./services/local-auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    const cookies = cookie.parse(opts.req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    if (token) {
      ctx.user = findSessionUser(token);
    }
  } catch {
    // 认证是可选的；受保护接口由中间件拦截
  }
  return ctx;
}
