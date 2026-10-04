import { NextResponse, type NextRequest } from "next/server";
import { isCloudEnabled } from "@/lib/supabase";
import { refreshSession } from "@/lib/supabase-server";

/**
 * Optimistic auth gate (Next 16 `proxy` convention). The secure checks
 * live at the data layer (Supabase RLS); here we only redirect.
 * Without cloud credentials the app runs local-only, ungated.
 */
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!isCloudEnabled()) return NextResponse.next();
  const { response, userId } = await refreshSession(req);
  const isLogin = path === "/login" || path.startsWith("/auth/");
  if (!userId && !isLogin) return NextResponse.redirect(new URL("/login", req.nextUrl));
  if (userId && path === "/login") return NextResponse.redirect(new URL("/", req.nextUrl));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
