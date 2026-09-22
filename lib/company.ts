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
});

interface CompanyState {
  profile: CompanyProfile;
  updateProfile: (patch: Partial<CompanyProfile>) => void;
  setLogo: (logoDataUrl: string, logoExt: LogoExt) => void;
  clearLogo: () => void;
  reset: () => void;
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
    { name: "presupuestador-company-v1" },
  ),
);

/** True when at least one identity field or logo is set. */
export function hasCompanyData(p: CompanyProfile): boolean {
  return !!(p.name || p.address || p.phone || p.email || p.web || p.taxId || p.logoDataUrl);
}
