"use client";

import { useRef, useState } from "react";
import { hasCompanyData, useCompanyStore } from "@/lib/company";
import { processLogoFile } from "@/lib/logo";
import { useStrings } from "@/lib/locale";
import { InlineText } from "./inline-fields";

/**
 * Issuer company profile. Rarely edited (collapsed once filled), persisted
 * locally and rendered in client exports.
 */
export function CompanyBlock() {
  const profile = useCompanyStore((s) => s.profile);
  const updateProfile = useCompanyStore((s) => s.updateProfile);
  const setLogo = useCompanyStore((s) => s.setLogo);
  const clearLogo = useCompanyStore((s) => s.clearLogo);
  const t = useStrings();
  const [open, setOpen] = useState(() => !hasCompanyData(profile));
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    try {
      const { dataUrl, ext } = await processLogoFile(file);
      setLogo(dataUrl, ext);
    } catch {
      setLogoError(t["company.logoError"]);
    }
  };

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2 dark:bg-zinc-900">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {t["company.title"]}
          {profile.name ? <span className="font-normal text-zinc-500 dark:text-zinc-400"> — {profile.name}</span> : null}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="cursor-pointer rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {open ? t["company.done"] : t["company.edit"]}
        </button>
      </div>
      {open ? (
        <div className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-2">
          <label className="flex items-center gap-2">
            {t["company.name"]}
            <span className="min-w-0 flex-1">
              <InlineText value={profile.name} onCommit={(name) => updateProfile({ name })} ariaLabel={t["company.name"]} navId="company:name" />
            </span>
          </label>
          <label className="flex items-center gap-2">
            {t["company.taxId"]}
            <span className="min-w-0 flex-1">
              <InlineText value={profile.taxId} onCommit={(taxId) => updateProfile({ taxId })} ariaLabel={t["company.taxId"]} navId="company:taxId" />
            </span>
          </label>
          <label className="flex items-center gap-2">
            {t["company.phone"]}
            <span className="min-w-0 flex-1">
              <InlineText value={profile.phone} onCommit={(phone) => updateProfile({ phone })} ariaLabel={t["company.phone"]} navId="company:phone" />
            </span>
          </label>
          <label className="flex items-center gap-2">
            {t["company.email"]}
            <span className="min-w-0 flex-1">
              <InlineText value={profile.email} onCommit={(email) => updateProfile({ email })} ariaLabel={t["company.email"]} navId="company:email" />
            </span>
          </label>
          <label className="flex items-center gap-2">
            {t["company.web"]}
            <span className="min-w-0 flex-1">
              <InlineText value={profile.web} onCommit={(web) => updateProfile({ web })} ariaLabel={t["company.web"]} navId="company:web" />
            </span>
          </label>
          <div className="flex items-center gap-2">
            <span>{t["company.title"]} logo</span>
            {profile.logoDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.logoDataUrl} alt="" className="h-12 max-w-32 rounded border border-zinc-200 object-contain dark:border-zinc-700" />
                <button
                  type="button"
                  onClick={() => clearLogo()}
                  className="cursor-pointer rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {t["company.removeLogo"]}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {t["company.uploadLogo"]}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              aria-label={t["company.uploadLogo"]}
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            {t["company.address"]}
            <span className="min-w-0 flex-1">
              <InlineText value={profile.address} onCommit={(address) => updateProfile({ address })} ariaLabel={t["company.address"]} navId="company:address" />
            </span>
          </label>
          {logoError ? (
            <p role="alert" className="text-xs text-red-600 sm:col-span-2 dark:text-red-400">
              {logoError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
