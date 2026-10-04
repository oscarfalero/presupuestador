import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeCompanyProfile, type CompanyProfile } from "./company";
import { mergePersistedState, useBudgetStore } from "./store";
import type { Budget } from "./budget-types";

export const BUDGETS_STORAGE_KEY = "presupuestador-budgets-v1";
export const COMPANY_STORAGE_KEY = "presupuestador-company-v1";
/** Id of the account whose data the local cache belongs to. */
export const CLOUD_USER_MARKER_KEY = "presupuestador-cloud-user";

export interface BudgetDoc {
  budgets: Record<string, Budget>;
  order: string[];
  activeId: string | null;
}

export type SyncDecision = "pull" | "push" | "empty";

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function getStorage(): StorageLike | undefined {
  return typeof localStorage !== "undefined" ? localStorage : undefined;
}

export function readMarker(storage: StorageLike | undefined = getStorage()): string | null {
  try {
    return storage?.getItem(CLOUD_USER_MARKER_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeMarker(userId: string, storage: StorageLike | undefined = getStorage()): void {
  try {
    storage?.setItem(CLOUD_USER_MARKER_KEY, userId);
  } catch {
    // Private mode: the marker is an optimization, never a requirement.
  }
}

export function hasLocalSnapshot(
  key: string,
  storage: StorageLike | undefined = getStorage(),
): boolean {
  try {
    return storage?.getItem(key) != null;
  } catch {
    return false;
  }
}

/**
 * First-login reconciliation (pure, tested):
 * - Cloud has data → it wins (another device already synced).
 * - No cloud data + our own local snapshot (pre-cloud era, or offline
 *   edits) → push it up once.
 * - No cloud data + foreign/empty cache (a different account used this
 *   browser, or brand-new user) → start empty. Never upload another
 *   account's cache, never persist the sample budget.
 */
export function decideInitialSync(args: {
  cloudPresent: boolean;
  localPresent: boolean;
  markerUserId: string | null;
  currentUserId: string;
}): SyncDecision {
  if (args.cloudPresent) return "pull";
  if (!args.localPresent) return "empty";
  if (args.markerUserId === null || args.markerUserId === args.currentUserId) return "push";
  return "empty";
}

/** Minimal table IO so the orchestration below is testable with fakes. */
export interface StoreIo<T> {
  load: (userId: string) => Promise<T | null>;
  save: (userId: string, value: T) => Promise<void>;
}

export function supabaseBudgetIo(client: SupabaseClient): StoreIo<BudgetDoc> {
  return {
    load: async (userId) => {
      const { data, error } = await client
        .from("budget_store")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // Sanitize through the same merge the local persist layer uses.
      const merged = mergePersistedState(data.data, useBudgetStore.getState());
      return { budgets: merged.budgets, order: merged.order, activeId: merged.activeId };
    },
    save: async (userId, doc) => {
      const { error } = await client
        .from("budget_store")
        .upsert({ user_id: userId, data: doc }, { onConflict: "user_id" });
      if (error) throw error;
    },
  };
}

export function supabaseCompanyIo(client: SupabaseClient): StoreIo<CompanyProfile> {
  return {
    load: async (userId) => {
      const { data, error } = await client
        .from("company_store")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return sanitizeCompanyProfile(data.data as Partial<CompanyProfile> | undefined);
    },
    save: async (userId, profile) => {
      const { error } = await client
        .from("company_store")
        .upsert({ user_id: userId, data: profile }, { onConflict: "user_id" });
      if (error) throw error;
    },
  };
}

/** Drops the on-device snapshots (both persist keys). Cache only. */
export function clearLocalCache(storage: StorageLike | undefined = getStorage()): void {
  try {
    storage?.removeItem(BUDGETS_STORAGE_KEY);
    storage?.removeItem(COMPANY_STORAGE_KEY);
  } catch {
    // Best effort: a stale cache is harmless once the stores are reset.
  }
}

export interface SyncDeps {
  budgets: StoreIo<BudgetDoc>;
  company: StoreIo<CompanyProfile>;
  userId: string;
  localBudgets: BudgetDoc;
  localProfile: CompanyProfile;
  storage?: StorageLike | undefined;
  applyBudgets: (doc: BudgetDoc) => void;
  applyProfile: (profile: CompanyProfile) => void;
  clearBudgets: () => void;
  clearProfile: () => void;
}

/**
 * Runs the first-login reconciliation for both stores and records the
 * marker. Callers set the sync status around it.
 */
export async function initialSync(deps: SyncDeps): Promise<SyncDecision> {
  const storage = deps.storage ?? getStorage();
  const [cloudBudgets, cloudCompany] = await Promise.all([
    deps.budgets.load(deps.userId),
    deps.company.load(deps.userId),
  ]);
  const marker = readMarker(storage);
  const budgetDecision = decideInitialSync({
    cloudPresent: cloudBudgets !== null,
    localPresent: hasLocalSnapshot(BUDGETS_STORAGE_KEY, storage),
    markerUserId: marker,
    currentUserId: deps.userId,
  });
  const companyDecision = decideInitialSync({
    cloudPresent: cloudCompany !== null,
    localPresent: hasLocalSnapshot(COMPANY_STORAGE_KEY, storage),
    markerUserId: marker,
    currentUserId: deps.userId,
  });
  if (budgetDecision === "pull" && cloudBudgets) deps.applyBudgets(cloudBudgets);
  if (budgetDecision === "push") await deps.budgets.save(deps.userId, deps.localBudgets);
  // Empty means "nothing of ours here": reset the stores AND drop the
  // snapshots before recording the marker, so a reload can never promote
  // a foreign cache into a push (marker == current + snapshot present).
  if (budgetDecision === "empty") {
    deps.clearBudgets();
    try {
      storage?.removeItem(BUDGETS_STORAGE_KEY);
    } catch {
      // Stores are already reset; the marker below still protects us.
    }
  }
  if (companyDecision === "pull" && cloudCompany) deps.applyProfile(cloudCompany);
  if (companyDecision === "push") await deps.company.save(deps.userId, deps.localProfile);
  if (companyDecision === "empty") {
    deps.clearProfile();
    try {
      storage?.removeItem(COMPANY_STORAGE_KEY);
    } catch {
      // Same as above.
    }
  }
  writeMarker(deps.userId, storage);
  return budgetDecision === "pull" || companyDecision === "pull" ? "pull"
    : budgetDecision === "push" || companyDecision === "push" ? "push"
    : "empty";
}
