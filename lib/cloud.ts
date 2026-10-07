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

/**
 * Union-merge for the document-model store (pure, tested).
 *
 * Saves must never clobber budgets they have never seen: a session with
 * older state pushing over newer cloud data used to silently delete
 * other devices' budgets (issue #52). Merging instead:
 * - every budget present on either side survives (per-id, local wins),
 * - cloud order is preserved with local-only budgets appended,
 * - the active budget falls back to the first entry when it points nowhere.
 *
 * Explicit deletions are NOT inferred here — see `deletedSince` +
 * `saveMerged`: deletes propagate only for ids the pusher previously
 * synced and now lacks.
 */
export function mergeBudgetDocs(cloud: BudgetDoc | null, local: BudgetDoc): BudgetDoc {
  // Always a fresh object: callers (saveMerged) mutate the result and
  // must never touch the live store references hidden inside `local`.
  if (!cloud) return { budgets: { ...local.budgets }, order: [...local.order], activeId: local.activeId };
  const budgets = { ...cloud.budgets, ...local.budgets };
  const seen = new Set<string>();
  const order = [...cloud.order, ...local.order].filter((id) => {
    if (seen.has(id) || !budgets[id]) return false;
    seen.add(id);
    return true;
  });
  const activeId =
    local.activeId && budgets[local.activeId]
      ? local.activeId
      : cloud.activeId && budgets[cloud.activeId]
        ? cloud.activeId
        : (order[0] ?? null);
  return { budgets, order, activeId };
}

/**
 * Budgets the last push pulled in from the cloud that this tab still
 * lacks. Push callers should apply the result back to the local store:
 * without it, the NEXT push would mistake those unseen budgets for
 * local deletes and wipe them (the exact #52 data loss, one push later).
 * `exclude` holds ids removed locally while the save was in flight —
 * re-adding those would resurrect genuine deletes. Returns null when
 * there is nothing new to apply. Pure, tested.
 */
export function unseenBudgets(
  current: BudgetDoc,
  written: BudgetDoc,
  exclude: ReadonlySet<string> = new Set(),
): BudgetDoc | null {
  const missing = written.order.filter((id) => !current.budgets[id] && !exclude.has(id));
  if (missing.length === 0) return null;
  const budgets = { ...current.budgets };
  for (const id of missing) budgets[id] = written.budgets[id];
  const order = [...current.order, ...missing];
  const activeId =
    current.activeId && budgets[current.activeId]
      ? current.activeId
      : written.activeId && budgets[written.activeId]
        ? written.activeId
        : (order[0] ?? null);
  return { budgets, order, activeId };
}

/**
 * Ids the pusher previously synced but no longer holds: genuine local
 * deletes (as opposed to budgets it simply never saw). Pure, tested.
 */
export function deletedSince(lastSynced: BudgetDoc | null, current: BudgetDoc): string[] {
  if (!lastSynced) return [];
  const currentIds = new Set([...current.order, ...Object.keys(current.budgets)]);
  return [...new Set([...lastSynced.order, ...Object.keys(lastSynced.budgets)])].filter(
    (id) => !currentIds.has(id),
  );
}

/** Key-order-insensitive serialization: semantically equal docs compare equal. */
function stableStringify(value: unknown): string {
  const canon = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === "object")
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]));
    return v;
  };
  return JSON.stringify(canon(value));
}

/**
 * True when both docs hold the same budgets in the same order with the
 * same active budget. Used to skip no-op pushes (issue #57): a load or a
 * hydration echo must never upload. Fail-safe direction — anything
 * unexpected compares unequal and still saves.
 */
export function docsEqual(a: BudgetDoc, b: BudgetDoc): boolean {
  return stableStringify(a) === stableStringify(b);
}

/** Same no-op guard for the company profile (issue #57). */
export function profilesEqual(a: CompanyProfile, b: CompanyProfile): boolean {
  return stableStringify(a) === stableStringify(b);
}

export interface PushPlan {
  saveBudgets: boolean;
  saveProfile: boolean;
}

/**
 * Which stores actually hold unsynced changes (issue #57). Null baselines
 * (never synced this session) always save. Pure, tested; pushNow obeys it.
 */
export function planPush(
  lastSynced: BudgetDoc | null,
  current: BudgetDoc,
  lastProfile: CompanyProfile | null,
  profile: CompanyProfile,
): PushPlan {
  return {
    saveBudgets: !lastSynced || !docsEqual(lastSynced, current),
    saveProfile: !lastProfile || !profilesEqual(lastProfile, profile),
  };
}

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

export function supabaseBudgetIo(client: SupabaseClient): BudgetStoreIo {
  const io: BudgetStoreIo = {
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
    /**
     * Merge-safe save (issue #52): read-modify-write that unions the
     * local doc with whatever the cloud holds now, then applies the
     * pusher's genuine deletes. Returns the doc actually written so
     * callers can track it as the new sync baseline. Concurrent edits
     * to the SAME budget still resolve last-writer-wins per budget.
     *
     * Residual race (known limitation): two pushes interleaving their
     * load/merge/save windows can still drop one side's union — true
     * safety needs an atomic server-side merge (Postgres function).
     * The window is milliseconds wide and budgets are never deleted by
     * it, only concurrent additions may need a re-push.
     */
    saveMerged: async (userId, doc, deletedIds) => {
      const loaded = await io.load(userId);
      const merged = mergeBudgetDocs(loaded, doc);
      for (const id of deletedIds) {
        delete merged.budgets[id];
      }
      merged.order = merged.order.filter((id) => merged.budgets[id]);
      if (merged.activeId && !merged.budgets[merged.activeId]) {
        merged.activeId = merged.order[0] ?? null;
      }
      await io.save(userId, merged);
      return merged;
    },
  };
  return io;
}

/** Budget store IO with merge-safe saves. `save` stays for the initial-push path (cloud known-absent). */
export interface BudgetStoreIo extends StoreIo<BudgetDoc> {
  saveMerged: (userId: string, doc: BudgetDoc, deletedIds: string[]) => Promise<BudgetDoc>;
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
