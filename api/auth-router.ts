import * as cookie from "cookie";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import {
  createSession,
  deleteSession,
  ensureOwner,
  touchSignIn,
  verifyAccessToken,
} from "./services/local-auth";

function setSessionCookie(
  headers: Headers,
  resHeaders: Headers,
  token: string,
  expiresAt: Date,
) {
  const opts = getSessionCookieOptions(headers);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      expires: expiresAt,
    }),
  );
}

function clearSessionCookie(headers: Headers, resHeaders: Headers) {
  const opts = getSessionCookieOptions(headers);
  resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, "", {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: 0,
    }),
  );
}

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),

  login: publicQuery
    .input(z.object({ token: z.string().min(1, "请输入访问令牌") }))
    .mutation(({ ctx, input }) => {
      if (!verifyAccessToken(input.token.trim())) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "令牌不正确，请检查后重试",
        });
      }
      const user = ensureOwner();
      touchSignIn(user.id);
      const { token, expiresAt } = createSession(user.id);
      setSessionCookie(ctx.req.headers, ctx.resHeaders, token, expiresAt);
      return { id: user.id, name: user.name };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const cookies = cookie.parse(ctx.req.headers.get("cookie") || "");
    const token = cookies[Session.cookieName];
    if (token) deleteSession(token);
    clearSessionCookie(ctx.req.headers, ctx.resHeaders);
    return { success: true };
  }),
});
