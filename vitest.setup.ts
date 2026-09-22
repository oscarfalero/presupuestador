import { vi } from "vitest";

// In-memory localStorage so the zustand `persist` middleware used by
// `lib/store.ts` works in the Node test environment.
const backing = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => backing.get(key) ?? null,
  setItem: (key: string, value: string) => {
    backing.set(key, value);
  },
  removeItem: (key: string) => {
    backing.delete(key);
  },
  clear: () => backing.clear(),
  get length() {
    return backing.size;
  },
  key: (index: number) => [...backing.keys()][index] ?? null,
});
