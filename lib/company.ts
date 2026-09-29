"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LogoExt = "png" | "jpeg";

export interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  taxId: string;
  logoDataUrl: string | null;
  logoExt: LogoExt | null;
  /** General particular conditions: default for new budgets. */
  terms: string;
  /** General payment terms: default for new budgets. */
  payment: string;
  /** Company hour value as free text, read by a person or the AI. */
  hourlyRate: string;
  /** Predefined instructions, free text, read by the budget tool / AI. */
  instructions: string;
}

export const emptyCompany = (): CompanyProfile => ({
  name: "",
  address: "",
  phone: "",
  email: "",
  web: "",
  taxId: "",
  logoDataUrl: null,
  logoExt: null,
  terms: "",
  payment: "",
  hourlyRate: "",
  instructions: "",
});

interface CompanyState {
  profile: CompanyProfile;
  updateProfile: (patch: Partial<CompanyProfile>) => void;
  setLogo: (logoDataUrl: string, logoExt: LogoExt) => void;
  clearLogo: () => void;
  reset: () => void;
}

/**
 * Coerces any stored shape into a valid profile. Runs on every load
 * (not only on version bumps) because the hour value changed type
 * mid-branch and same-version snapshots skip `migrate`. Legacy
 * supplier/source lists fold into `instructions` so nothing is lost.
 */
export function sanitizeCompanyProfile(saved: Partial<CompanyProfile> | undefined): CompanyProfile {
  const legacy = saved as (Partial<CompanyProfile> & { preferredSuppliers?: unknown; preferredSources?: unknown }) | undefined;
  const hourlyRate = legacy?.hourlyRate;
  const legacyLists = [legacy?.preferredSuppliers, legacy?.preferredSources]
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .join("\n\n");
  const profile: CompanyProfile = {
    ...emptyCompany(),
    ...legacy,
    hourlyRate: typeof hourlyRate === "number" ? String(hourlyRate) : (hourlyRate ?? ""),
    instructions:
      typeof legacy?.instructions === "string" && legacy.instructions ? legacy.instructions : legacyLists,
  };
  delete (profile as unknown as Record<string, unknown>).preferredSuppliers;
  delete (profile as unknown as Record<string, unknown>).preferredSources;
  return profile;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      profile: emptyCompany(),
      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      setLogo: (logoDataUrl, logoExt) => set((s) => ({ profile: { ...s.profile, logoDataUrl, logoExt } })),
      clearLogo: () => set((s) => ({ profile: { ...s.profile, logoDataUrl: null, logoExt: null } })),
      reset: () => set({ profile: emptyCompany() }),
    }),
    {
      name: "presupuestador-company-v1",
      version: 1,
      migrate: migrateCompanyState,
      merge: (persisted, current) => ({
        ...current,
        ...((persisted as Partial<CompanyState>) ?? {}),
        profile: sanitizeCompanyProfile(
          (persisted as { profile?: Partial<CompanyProfile> } | undefined)?.profile,
        ),
      }),
    },
  ),
);

/**
 * Backfills profiles persisted before the company-defaults/settings
 * fields existed. Exported pure for tests (persist is inert in Node).
 */
export function migrateCompanyState(persisted: unknown): { profile: CompanyProfile } {
  const saved = (persisted as { profile?: Partial<CompanyProfile> } | undefined)?.profile;
  return { profile: sanitizeCompanyProfile(saved) };
}
