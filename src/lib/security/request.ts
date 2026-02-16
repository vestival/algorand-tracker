import { getEnv } from "@/lib/env";

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function assertSameOrigin(request: Request): { ok: true } | { ok: false; status: number; error: string } {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!origin || !host) {
    return { ok: false, status: 403, error: "Missing origin or host header" };
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return { ok: false, status: 403, error: "Invalid origin header" };
  }

  if (originHost !== host) {
    return { ok: false, status: 403, error: "Cross-origin request blocked" };
  }

  // Defense in depth: ensure host aligns with configured app URL when present.
  try {
    const envHost = new URL(getEnv().NEXTAUTH_URL).host;
    if (envHost !== host) {
      return { ok: false, status: 403, error: "Host mismatch" };
    }
  } catch {
    return { ok: false, status: 500, error: "Invalid server configuration" };
  }

  return { ok: true };
}
