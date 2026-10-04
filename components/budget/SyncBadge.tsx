"use client";

import { useSyncStore, type SyncStatus } from "@/lib/sync-status";
import { useStrings } from "@/lib/locale";

const DOT: Record<SyncStatus, string> = {
  local: "bg-zinc-400",
  loading: "bg-amber-400",
  saving: "bg-amber-400",
  synced: "bg-green-500",
  error: "bg-red-500",
};

/** Tiny cloud-sync indicator for the headers. Hidden in local-only mode. */
export function SyncBadge() {
  const status = useSyncStore((s) => s.status);
  const t = useStrings();
  if (status === "local") return null;
  const label =
    status === "synced"
      ? t["sync.synced"]
      : status === "error"
        ? t["sync.error"]
        : t["sync.saving"];
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex cursor-default items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
    >
      <span aria-hidden className={`size-2 rounded-full ${DOT[status]}`} />
      <span className="max-md:hidden">{label}</span>
    </span>
  );
}
