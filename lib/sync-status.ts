import { create } from "zustand";

export type SyncStatus = "local" | "loading" | "saving" | "synced" | "error";

interface SyncState {
  status: SyncStatus;
  setStatus: (status: SyncStatus) => void;
}

/** Ephemeral cloud-sync indicator. Never persisted. */
export const useSyncStore = create<SyncState>()((set) => ({
  status: "local",
  setStatus: (status) => set({ status }),
}));
