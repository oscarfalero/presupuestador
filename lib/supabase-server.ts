import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { cloudConfig } from "./supabase";

/**
 * Server-component client (read-only cookies). Returns `null` when
 * cloud is not configured so routes keep working in local-only mode.
 */
export async function createAuthedServerClient() {
  const cfg = cloudConfig();
  if (!cfg) return null;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => {
        try {
          for (const { name, value, options } of all) store.set(name, value, options);
        } catch {
          // Called from a Server Component: session refresh happens in proxy.
        }
      },
    },
  });
}

export interface SessionRefresh {
  response: NextResponse;
  userId: string | null;
}

/**
 * Refreshes the Supabase session on the way through `proxy.ts`
 * (standard @supabase/ssr pattern) and reports the current user.
 */
export async function refreshSession(req: NextRequest): Promise<SessionRefresh> {
  let response = NextResponse.next({ request: req });
  const cfg = cloudConfig();
  if (!cfg) return { response, userId: null };
  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all) => {
        for (const { name, value } of all) req.cookies.set(name, value);
        response = NextResponse.next({ request: req });
        for (const { name, value, options } of all) response.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, userId: user?.id ?? null };
}
