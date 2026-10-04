import { describe, expect, it } from "vitest";
import {
  CLOUD_USER_MARKER_KEY,
  decideInitialSync,
  hasLocalSnapshot,
  initialSync,
  readMarker,
  writeMarker,
  type BudgetDoc,
  type StorageLike,
  type StoreIo,
} from "./cloud";
import { emptyCompany } from "./company";

function memStorage(entries: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map(Object.entries(entries));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
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

describe("initialSync", () => {
  function deps(over: Partial<Parameters<typeof initialSync>[0]> = {}) {
    const budgets = memIo<BudgetDoc>();
    const company = memIo<ReturnType<typeof emptyCompany>>();
    const applied: { budgets: BudgetDoc | null; profile: ReturnType<typeof emptyCompany> | null } = {
      budgets: null,
      profile: null,
    };
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
    const { budgets, applied, args } = deps({
      storage: memStorage({
        "presupuestador-budgets-v1": "{}",
        [CLOUD_USER_MARKER_KEY]: "u2",
      }),
    });
    const decision = await initialSync(args);
    expect(decision).toBe("empty");
    expect(budgets.saved.value).toBeNull();
    expect(applied.budgets).toBeNull();
    expect(readMarker(args.storage)).toBe("u1");
  });
});
