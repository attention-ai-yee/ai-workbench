import type { CookieOptions } from "hono/utils/cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

/** 部署在子路径 /ai-workbench/ 下，cookie 仅对该路径生效。 */
const COOKIE_PATH = "/ai-workbench/";

export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);
  // 经 nginx 反代时，按 X-Forwarded-Proto 判断是否 HTTPS；
  // 未带该头（直连）则按 host 判断。
  const fwdProto = headers.get("x-forwarded-proto") || "";
  const isHttps = fwdProto === "https" || (!fwdProto && !localhost && false);

  return {
    httpOnly: true,
    path: COOKIE_PATH,
    sameSite: localhost ? "Lax" : "Lax",
    secure: isHttps,
  };
}
