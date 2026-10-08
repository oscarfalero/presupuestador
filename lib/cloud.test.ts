import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLOUD_USER_MARKER_KEY,
  decideInitialSync,
  deletedSince,
  docsEqual,
  hasLocalSnapshot,
  initialSync,
  mergeBudgetDocs,
  planPush,
  profilesEqual,
  readMarker,
  supabaseBudgetIo,
  unseenBudgets,
  writeMarker,
  type BudgetDoc,
  type BudgetStoreIo,
  type StorageLike,
  type StoreIo,
} from "./cloud";
import { createBudget, type Budget } from "./budget-types";
import { emptyCompany } from "./company";
import { resolveNextParam } from "./redirect";

function memStorage(entries: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function memIo<T>(initial: T | null = null): StoreIo<T> & { saved: { value: T | null } } {
  const saved = { value: initial as T | null };
  return {
    saved,
    load: async () => saved.value,
    save: async (_userId, value) => {
      saved.value = value;
    },
  };
}

const EMPTY_DOC: BudgetDoc = { budgets: {}, order: [], activeId: null };

describe("decideInitialSync", () => {
  it("pulls when cloud has data, whatever the cache holds", () => {
    for (const localPresent of [true, false]) {
      for (const markerUserId of [null, "u1", "u2"]) {
        expect(
          decideInitialSync({ cloudPresent: true, localPresent, markerUserId, currentUserId: "u1" }),
        ).toBe("pull");
      }
    }
  });

  it("pushes our own pre-cloud snapshot once", () => {
    expect(
      decideInitialSync({ cloudPresent: false, localPresent: true, markerUserId: null, currentUserId: "u1" }),
    ).toBe("push");
    expect(
      decideInitialSync({ cloudPresent: false, localPresent: true, markerUserId: "u1", currentUserId: "u1" }),
    ).toBe("push");
  });

  it("never uploads another account's cache", () => {
    expect(
      decideInitialSync({ cloudPresent: false, localPresent: true, markerUserId: "u2", currentUserId: "u1" }),
    ).toBe("empty");
  });

  it("starts empty on a fresh browser", () => {
    expect(
      decideInitialSync({ cloudPresent: false, localPresent: false, markerUserId: null, currentUserId: "u1" }),
    ).toBe("empty");
  });
});

describe("marker + snapshot helpers", () => {
  it("round-trips the marker and survives throwing storage", () => {
    const s = memStorage();
    expect(readMarker(s)).toBeNull();
    writeMarker("u9", s);
    expect(readMarker(s)).toBe("u9");
    expect(s.map.get(CLOUD_USER_MARKER_KEY)).toBe("u9");
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(readMarker(broken)).toBeNull();
    expect(hasLocalSnapshot("k", broken)).toBe(false);
    expect(() => writeMarker("u9", broken)).not.toThrow();
  });

  it("detects snapshot presence", () => {
    expect(hasLocalSnapshot("k", memStorage())).toBe(false);
    expect(hasLocalSnapshot("k", memStorage({ k: "{}" }))).toBe(true);
  });
});

describe("resolveNextParam", () => {
  it("keeps same-origin paths and falls back otherwise", () => {
    expect(resolveNextParam("/account")).toBe("/account");
    expect(resolveNextParam("/budgets/abc")).toBe("/budgets/abc");
    expect(resolveNextParam(null)).toBe("/account");
    expect(resolveNextParam("")).toBe("/account");
    expect(resolveNextParam("https://evil.example/account")).toBe("/account");
    expect(resolveNextParam("//evil.example/account")).toBe("/account");
    expect(resolveNextParam("/\\evil")).toBe("/account");
  });
});

describe("initialSync", () => {
  function deps(over: Partial<Parameters<typeof initialSync>[0]> = {}) {
    const budgets = memIo<BudgetDoc>();
    const company = memIo<ReturnType<typeof emptyCompany>>();
    const applied: { budgets: BudgetDoc | null; profile: ReturnType<typeof emptyCompany> | null } = {
      budgets: null,
      profile: null,
    };
    const cleared = { budgets: 0, profile: 0 };
    return {
      budgets,
      company,
      applied,
      args: {
        budgets,
        company,
        userId: "u1",
        localBudgets: EMPTY_DOC,
        localProfile: emptyCompany(),
        storage: memStorage(),
        applyBudgets: (doc: BudgetDoc) => {
          applied.budgets = doc;
        },
        applyProfile: (p: ReturnType<typeof emptyCompany>) => {
          applied.profile = p;
        },
        clearBudgets: () => {
          cleared.budgets += 1;
        },
        clearProfile: () => {
          cleared.profile += 1;
        },
        ...over,
      } as Parameters<typeof initialSync>[0],
    };
  }

  it("pulls cloud data over the cache and records the marker", async () => {
    const { budgets, company, applied, args } = deps({
      storage: memStorage({ "presupuestador-budgets-v1": "{}" }),
    });
    const cloudDoc: BudgetDoc = { budgets: {}, order: ["b1"], activeId: "b1" };
    budgets.saved.value = cloudDoc;
    const profile = { ...emptyCompany(), name: "ACME" };
    company.saved.value = profile;
    const decision = await initialSync(args);
    expect(decision).toBe("pull");
    expect(applied.budgets).toEqual(cloudDoc);
    expect(applied.profile).toEqual(profile);
    expect(readMarker(args.storage)).toBe("u1");
  });

  it("pushes our own snapshot once when the cloud is empty", async () => {
    const local: BudgetDoc = { budgets: {}, order: ["b9"], activeId: "b9" };
    const { budgets, args } = deps({
      localBudgets: local,
      storage: memStorage({ "presupuestador-budgets-v1": "{}", "presupuestador-company-v1": "{}" }),
    });
    const decision = await initialSync(args);
    expect(decision).toBe("push");
    expect(budgets.saved.value).toEqual(local);
  });

  it("starts empty and never pushes a foreign cache", async () => {
    const storage = memStorage({
      "presupuestador-budgets-v1": "{}",
      "presupuestador-company-v1": "{}",
      [CLOUD_USER_MARKER_KEY]: "u2",
    });
    const first = deps({ storage });
    const decision = await initialSync(first.args);
    expect(decision).toBe("empty");
    expect(first.budgets.saved.value).toBeNull();
    expect(first.applied.budgets).toBeNull();
    // Regression: the foreign cache is dropped BEFORE the marker flips,
    // so a reload can never promote it into a push.
    expect(storage.map.has("presupuestador-budgets-v1")).toBe(false);
    expect(storage.map.has("presupuestador-company-v1")).toBe(false);
    expect(readMarker(storage)).toBe("u1");
    // Reload with the same storage: still empty, still no push.
    const second = deps({ storage });
    expect(await initialSync(second.args)).toBe("empty");
    expect(second.budgets.saved.value).toBeNull();
    expect(second.company.saved.value).toBeNull();
  });
});

describe("mergeBudgetDocs", () => {
  const doc = (ids: string[], active: string | null, tag = ""): BudgetDoc => ({
    budgets: Object.fromEntries(
      ids.map((id) => [id, { ...createBudget({ name: `${tag}${id}`, number: id }), id }]),
    ),
    order: ids,
    activeId: active,
  });
  const names = (d: BudgetDoc) => d.order.map((id) => (d.budgets[id] as Budget).name);

  it("returns an equal but fresh doc when the cloud is empty", () => {
    const local = doc(["a"], "a");
    const merged = mergeBudgetDocs(null, local);
    expect(merged).toEqual(local);
    expect(merged).not.toBe(local);
  });

  it("unions both sides with local winning per budget", () => {
    const cloud = doc(["a", "b"], "a", "cloud-");
    const local = doc(["a", "c"], "c", "local-");
    const merged = mergeBudgetDocs(cloud, local);
    expect(names(merged)).toEqual(["local-a", "cloud-b", "local-c"]);
    expect((merged.budgets["a"] as Budget).name).toBe("local-a");
    expect(merged.order).toEqual(["a", "b", "c"]);
    expect(merged.activeId).toBe("c");
  });

  it("drops dangling order entries and repairs the active budget", () => {
    const cloud = doc(["a"], "ghost");
    const merged = mergeBudgetDocs(cloud, doc([], null));
    expect(merged.order).toEqual(["a"]);
    expect(merged.activeId).toBe("a");
  });

  it("falls back to cloud activeId only when local has none", () => {
    const merged = mergeBudgetDocs(doc(["a"], "a"), doc(["a", "b"], null));
    expect(merged.activeId).toBe("a");
  });

  it("never returns the local doc by reference (callers mutate the result)", () => {
    const local = doc(["a"], "a");
    const merged = mergeBudgetDocs(null, local);
    expect(merged).not.toBe(local);
    expect(merged).toEqual(local);
    delete merged.budgets["a"];
    expect(local.budgets["a"]).toBeDefined();
  });
});

describe("deletedSince", () => {
  const doc = (ids: string[]): BudgetDoc => ({
    budgets: Object.fromEntries(ids.map((id) => [id, createBudget({ name: id, number: id })])),
    order: ids,
    activeId: ids[0] ?? null,
  });

  it("returns null when the tab already holds everything", () => {
    expect(unseenBudgets(doc(["a"]), doc(["a"]))).toBeNull();
  });

  it("returns the missing budgets appended, keeping the local active budget", () => {
    const applied = unseenBudgets(doc(["a"]), { ...doc(["a", "c"]), activeId: "c" });
    expect(applied?.order).toEqual(["a", "c"]);
    expect(Object.keys(applied?.budgets ?? {}).sort()).toEqual(["a", "c"]);
    expect(applied?.activeId).toBe("a");
  });

  it("falls back to the written active budget when local has none", () => {
    const applied = unseenBudgets(doc([]), doc(["a"]));
    expect(applied?.order).toEqual(["a"]);
    expect(applied?.activeId).toBe("a");
  });

  it("never re-adds ids removed while the save was in flight", () => {
    const applied = unseenBudgets(doc(["a"]), doc(["a", "b"]), new Set(["b"]));
    expect(applied).toBeNull();
  });
});

describe("deletedSince", () => {
  const doc = (ids: string[]): BudgetDoc => ({
    budgets: Object.fromEntries(ids.map((id) => [id, createBudget({ name: id, number: id })])),
    order: ids,
    activeId: ids[0] ?? null,
  });

  it("returns nothing without a baseline", () => {
    expect(deletedSince(null, doc(["a"]))).toEqual([]);
  });

  it("reports only ids the baseline had and current lacks", () => {
    expect(deletedSince(doc(["a", "b", "c"]), doc(["a", "c", "d"]))).toEqual(["b"]);
  });
});

describe("docsEqual + profilesEqual + planPush (issue #57)", () => {
  const doc57 = (ids: string[], active?: string | null): BudgetDoc => ({
    budgets: Object.fromEntries(ids.map((id) => [id, createBudget({ name: id, number: id })])),
    order: ids,
    activeId: active === undefined ? (ids[0] ?? null) : active,
  });
  const profile57 = { ...emptyCompany(), name: "DC Reformas" };

  it("treats identical docs as equal regardless of key insertion order", () => {
    const a = doc57(["a", "b"]);
    const reordered: BudgetDoc = {
      activeId: a.activeId,
      order: [...a.order],
      budgets: { b: a.budgets["b"], a: a.budgets["a"] },
    };
    expect(docsEqual(a, reordered)).toBe(true);
  });

  it("detects order, content and activeId differences", () => {
    const a = doc57(["a", "b"]);
    expect(docsEqual(a, doc57(["b", "a"]))).toBe(false);
    expect(docsEqual(a, doc57(["a"]))).toBe(false);
    expect(docsEqual(a, doc57(["a", "b"], "b"))).toBe(false);
    const renamed = doc57(["a", "b"]);
    (renamed.budgets["a"] as Budget).name = "changed";
    expect(docsEqual(a, renamed)).toBe(false);
  });

  it("compares profiles by value", () => {
    expect(profilesEqual(profile57, { ...profile57 })).toBe(true);
    expect(profilesEqual(profile57, { ...profile57, name: "Other" })).toBe(false);
  });

  it("treats null vs missing profile fields as different (fail-safe: saves)", () => {
    const nulled = { ...profile57, logoDataUrl: null };
    const missing = { ...profile57 };
    delete (missing as Partial<typeof missing>).logoDataUrl;
    expect(profilesEqual(nulled, missing)).toBe(false);
  });

  it("plans saves for unknown baselines, silence for identical state", () => {
    expect(planPush(null, doc57(["a"]), null, profile57)).toEqual({ saveBudgets: true, saveProfile: true });
    // NB: two independently built docs carry fresh random item/chapter
    // ids, so "identical" always means a deep copy of the same doc.
    const a = doc57(["a"]);
    const copy: BudgetDoc = JSON.parse(JSON.stringify(a));
    expect(planPush(a, copy, profile57, { ...profile57 })).toEqual({
      saveBudgets: false,
      saveProfile: false,
    });
  });

  it("saves each store independently", () => {
    const a = doc57(["a"]);
    const grown: BudgetDoc = JSON.parse(JSON.stringify(a));
    grown.budgets["b"] = createBudget({ name: "b", number: "b" });
    grown.order.push("b");
    expect(planPush(a, grown, profile57, { ...profile57 })).toEqual({
      saveBudgets: true,
      saveProfile: false,
    });
    const copy: BudgetDoc = JSON.parse(JSON.stringify(a));
    expect(planPush(a, copy, profile57, { ...profile57, phone: "600" })).toEqual({
      saveBudgets: false,
      saveProfile: true,
    });
  });

  it("a post-load hydration echo with identical content plans zero writes", () => {
    // Boot pulled this doc; persist rehydration lands afterwards with a
    // deep copy of the same content. pushNow must stay quiet: this is
    // the exact phantom-save scenario from issue #57.
    const pulled = doc57(["a", "b"], "b");
    const hydrated: BudgetDoc = JSON.parse(JSON.stringify(pulled));
    const pulledProfile = { ...profile57 };
    const hydratedProfile = JSON.parse(JSON.stringify(pulledProfile));
    expect(planPush(pulled, hydrated, pulledProfile, hydratedProfile)).toEqual({
      saveBudgets: false,
      saveProfile: false,
    });
  });
});

describe("saveMerged (issue #52)", () => {
  function fakeClient(store: { row: BudgetDoc | null }): SupabaseClient {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: store.row ? { data: store.row } : null, error: null }),
          }),
        }),
        upsert: async (rec: { data: BudgetDoc }) => {
          store.row = rec.data;
          return { error: null };
        },
      }),
    } as unknown as SupabaseClient;
  }

  const doc = (entries: Array<[string, string]>, active: string | null): BudgetDoc => ({
    budgets: Object.fromEntries(
      entries.map(([id, name]) => [id, { ...createBudget({ name, number: id }), id }]),
    ),
    order: entries.map(([id]) => id),
    activeId: active,
  });

  it("a stale push never drops cloud budgets it never saw", async () => {
    // Device 2 added "c" after device 1 last synced {a, b}.
    const cloud = { row: doc([["a", "A"], ["b", "B"], ["c", "C"]], "c") };
    const io = supabaseBudgetIo(fakeClient(cloud));
    const staleLocal = doc([["a", "A-edited"], ["b", "B"]], "a");
    const written = await io.saveMerged("u1", staleLocal, []);
    expect(Object.keys(written.budgets).sort()).toEqual(["a", "b", "c"]);
    expect((written.budgets["a"] as Budget).name).toBe("A-edited");
    expect((written.budgets["c"] as Budget).name).toBe("C");
    expect(written.order).toEqual(["a", "b", "c"]);
  });

  it("propagates genuine deletes while keeping concurrent additions", async () => {
    const cloud = { row: doc([["a", "A"], ["gone", "Gone"], ["new", "New"]], "a") };
    const io = supabaseBudgetIo(fakeClient(cloud));
    // This device synced {a, gone}, then deleted "gone"; "new" arrived meanwhile.
    const written = await io.saveMerged("u1", doc([["a", "A"]], "a"), ["gone"]);
    expect(Object.keys(written.budgets).sort()).toEqual(["a", "new"]);
    expect(written.order).toEqual(["a", "new"]);
  });

  it("repairs the active budget when its target was deleted", async () => {
    const cloud = { row: doc([["a", "A"]], "a") };
    const io = supabaseBudgetIo(fakeClient(cloud));
    const written = await io.saveMerged("u1", doc([["a", "A"]], "a"), ["a"]);
    expect(written.budgets).toEqual({});
    expect(written.order).toEqual([]);
    expect(written.activeId).toBeNull();
  });

  it("two successive stale pushes keep the unseen budget (pushNow cycle)", async () => {
    // D1 synced {a, b}; D2 added {c}; D1 edits "a" twice in a row.
    // Mirrors pushNow: saveMerged -> track baseline -> apply unseen back.
    const cloud = { row: doc([["a", "A"], ["b", "B"], ["c", "C"]], "c") };
    const io = supabaseBudgetIo(fakeClient(cloud));
    let lastSynced: BudgetDoc = doc([["a", "A"], ["b", "B"]], "a");
    let current = doc([["a", "A1"], ["b", "B"]], "a");
    for (const name of ["A1", "A2"]) {
      current = doc(
        [["a", name], ...current.order.filter((id) => id !== "a").map((id) => [id, (current.budgets[id] as Budget).name] as [string, string])],
        "a",
      );
      const written = await io.saveMerged("u1", current, deletedSince(lastSynced, current));
      lastSynced = written;
      const back = unseenBudgets(current, written);
      if (back) current = back;
    }
    expect(Object.keys(cloud.row.budgets).sort()).toEqual(["a", "b", "c"]);
    expect((cloud.row.budgets["a"] as Budget).name).toBe("A2");
    expect((cloud.row.budgets["c"] as Budget).name).toBe("C");
    expect(current.order).toContain("c");
  });

  it("in-flight local edits survive the apply-back, in-flight deletes stick", async () => {
    // Cloud {a, b, c} ("c" from another device); tab snapshots {a, b} for
    // the push; meanwhile the user adds "d" and deletes "b". The
    // apply-back must keep "d", pull in "c" and not resurrect "b";
    // the next push then propagates the delete.
    const cloud = { row: doc([["a", "A"], ["b", "B"], ["c", "C"]], "a") };
    const io = supabaseBudgetIo(fakeClient(cloud));
    const lastSynced: BudgetDoc = doc([["a", "A"], ["b", "B"]], "a");
    const prePush = doc([["a", "A"], ["b", "B"]], "a");
    const written = await io.saveMerged("u1", prePush, deletedSince(lastSynced, prePush));
    const fresh: BudgetDoc = doc([["a", "A"], ["d", "D"]], "d");
    const removed = new Set(
      [...prePush.order, ...Object.keys(prePush.budgets)].filter(
        (id) => !fresh.budgets[id] && !fresh.order.includes(id),
      ),
    );
    expect(removed).toEqual(new Set(["b"]));
    const back = unseenBudgets(fresh, written, removed);
    expect(back?.order).toEqual(["a", "d", "c"]);
    expect(back?.activeId).toBe("d");
    const written2 = await io.saveMerged("u1", back ?? fresh, deletedSince(written, back ?? fresh));
    expect(Object.keys(written2.budgets).sort()).toEqual(["a", "c", "d"]);
  });
});

describe("updatedAt round-trip (issue #56)", () => {
  const STAMP = "2026-05-05T05:05:05.000Z";

  function fakeIo(store: { row: BudgetDoc | null }): BudgetStoreIo {
    return supabaseBudgetIo({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: store.row ? { data: store.row } : null, error: null }),
          }),
        }),
        upsert: async (rec: { data: BudgetDoc }) => {
          store.row = rec.data;
          return { error: null };
        },
      }),
    } as unknown as SupabaseClient);
  }

  it("merge and saveMerged carry the stamp; legacy docs stay unstamped", async () => {
    const stamped: Budget = { ...createBudget({ name: "S", number: "s" }), id: "s", updatedAt: STAMP };
    const legacy: Budget = { ...createBudget({ name: "L", number: "l" }), id: "l" };
    expect("updatedAt" in legacy).toBe(false);
    const local: BudgetDoc = { budgets: { s: stamped, l: legacy }, order: ["s", "l"], activeId: "s" };
    const cloud: { row: BudgetDoc | null } = {
      row: {
        budgets: { c: { ...createBudget({ name: "C", number: "c" }), id: "c" } },
        order: ["c"],
        activeId: "c",
      },
    };
    const io = fakeIo(cloud);
    const written = await io.saveMerged("u1", local, []);
    expect(written.budgets["s"].updatedAt).toBe(STAMP);
    expect("updatedAt" in written.budgets["l"]).toBe(false);
    expect("updatedAt" in written.budgets["c"]).toBe(false);
    // What landed in the cloud row round-trips back untouched.
    expect(cloud.row?.budgets["s"].updatedAt).toBe(STAMP);
    const reread = await io.load("u1");
    expect(reread?.budgets["s"].updatedAt).toBe(STAMP);
    expect("updatedAt" in (reread?.budgets["l"] ?? {})).toBe(false);
  });
});
