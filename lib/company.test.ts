import { beforeEach, describe, expect, it } from "vitest";
import {
  emptyCompany,
  migrateCompanyState,
  sanitizeCompanyProfile,
  useCompanyStore,
} from "./company";

beforeEach(() => {
  localStorage.clear();
  useCompanyStore.setState({ profile: emptyCompany() });
});

describe("emptyCompany", () => {
  it("defaults commercial texts and budgeting settings to empty", () => {
    expect(emptyCompany()).toMatchObject({
      terms: "",
      payment: "",
      hourlyRate: "",
      instructions: "",
    });
  });
});

describe("migrateCompanyState", () => {
  it("backfills new fields on legacy snapshots without losing data", () => {
    const migrated = migrateCompanyState({ profile: { name: "ACME", taxId: "B123" } });
    expect(migrated.profile.name).toBe("ACME");
    expect(migrated.profile.taxId).toBe("B123");
    expect(migrated.profile.terms).toBe("");
    expect(migrated.profile.payment).toBe("");
    expect(migrated.profile.hourlyRate).toBe("");
    expect(migrated.profile.instructions).toBe("");
  });

  it("keeps stored values when present", () => {
    const migrated = migrateCompanyState({
      profile: { terms: "Net 30", payment: "Transfer", hourlyRate: "Oficial + Ayudante = 60€/h" },
    });
    expect(migrated.profile.terms).toBe("Net 30");
    expect(migrated.profile.payment).toBe("Transfer");
    expect(migrated.profile.hourlyRate).toBe("Oficial + Ayudante = 60€/h");
  });

  it("coerces a numeric hour value from early snapshots", () => {
    const migrated = migrateCompanyState({ profile: { hourlyRate: 35 } });
    expect(migrated.profile.hourlyRate).toBe("35");
  });

  it("folds legacy supplier/source lists into instructions", () => {
    const migrated = migrateCompanyState({
      profile: { preferredSuppliers: "Leroy", preferredSources: "Tarifas 2026" },
    });
    expect(migrated.profile.instructions).toBe("Leroy\n\nTarifas 2026");
    expect("preferredSuppliers" in migrated.profile).toBe(false);
    expect("preferredSources" in migrated.profile).toBe(false);
  });

  it("appends legacy lists when instructions already exist", () => {
    const migrated = migrateCompanyState({
      profile: { instructions: "Priorizar X", preferredSuppliers: "Leroy" },
    });
    expect(migrated.profile.instructions).toBe("Priorizar X\n\nLeroy");
  });

  it("sanitizeCompanyProfile coerces numbers on every load", () => {
    // Same-version snapshots skip `migrate`, so the merge-time
    // sanitizer must handle them too.
    const clean = sanitizeCompanyProfile({ name: "ACME", hourlyRate: 35 } as never);
    expect(clean.hourlyRate).toBe("35");
    expect(clean.name).toBe("ACME");
    expect(sanitizeCompanyProfile({ hourlyRate: true } as never).hourlyRate).toBe("");
    expect(sanitizeCompanyProfile(undefined)).toEqual(emptyCompany());
  });

  it("handles missing payloads", () => {
    expect(migrateCompanyState(undefined).profile).toEqual(emptyCompany());
  });
});

describe("updateProfile", () => {
  it("patches commercial defaults and settings", () => {
    useCompanyStore.getState().updateProfile({ terms: "Net 30", hourlyRate: "60€/h" });
    const p = useCompanyStore.getState().profile;
    expect(p.terms).toBe("Net 30");
    expect(p.hourlyRate).toBe("60€/h");
    expect(p.name).toBe("");
  });
});
