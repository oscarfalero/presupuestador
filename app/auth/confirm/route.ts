import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cloudConfig } from "@/lib/supabase";
import { resolveNextParam } from "@/lib/redirect";

/**
 * Completes invite/magic-link verification: exchanges the token for a
 * session (cookies set on the redirect response) and sends the user to
 * their account, where they set their password on first access.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const cfg = cloudConfig();
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = resolveNextParam(url.searchParams.get("next"));
  const login = new URL("/login", url);
  if (!cfg || !tokenHash || !type) return NextResponse.redirect(login);
  const response = NextResponse.redirect(new URL(next, url));
  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all) => {
        for (const { name, value, options } of all) response.cookies.set(name, value, options);
      },
    },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(login);
  return response;
}
