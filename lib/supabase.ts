import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface CloudConfig {
  url: string;
  anonKey: string;
}

/**
 * Cloud credentials. `null` when unset — the app then runs 100%
 * local-only (today's behaviour), so tests/builds need no secrets.
 */
export function cloudConfig(): CloudConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isCloudEnabled(): boolean {
  return cloudConfig() !== null;
}

let browser: SupabaseClient | null = null;

/** Singleton browser client; `null` when cloud is not configured. */
export function getBrowserClient(): SupabaseClient | null {
  const cfg = cloudConfig();
  if (!cfg) return null;
  browser ??= createBrowserClient(cfg.url, cfg.anonKey);
  return browser;
}
