"use client";

import { useEffect } from "react";
import { getBrowserClient, isCloudEnabled } from "@/lib/supabase";
import { useSyncStore } from "@/lib/sync-status";
import { initialSync, supabaseBudgetIo, supabaseCompanyIo } from "@/lib/cloud";
import { useBudgetStore } from "@/lib/store";
import { emptyCompany, useCompanyStore } from "@/lib/company";

const PUSH_DEBOUNCE_MS = 800;

/**
 * Invisible bridge between the local zustand stores and Supabase.
 * Mounted once in the root layout (it returns null). No-op without
 * cloud env. Boot is idempotent: safe to re-run on every SIGNED_IN.
 */
export function CloudSync() {
  useEffect(() => {
    const setStatus = useSyncStore.getState().setStatus;
    if (!isCloudEnabled()) {
      setStatus("local");
      return;
    }
    const client = getBrowserClient();
    if (!client) {
      setStatus("local");
      return;
    }
    let cancelled = false;
    let booting = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubs: Array<() => void> = [];

    async function pushNow() {
      const { data } = await client!.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || cancelled) return;
      setStatus("saving");
      try {
        const b = useBudgetStore.getState();
        const c = useCompanyStore.getState();
        await supabaseBudgetIo(client!).save(userId, {
          budgets: b.budgets,
          order: b.order,
          activeId: b.activeId,
        });
        await supabaseCompanyIo(client!).save(userId, c.profile);
        if (!cancelled) setStatus("synced");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    function schedulePush() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void pushNow();
      }, PUSH_DEBOUNCE_MS);
    }

    function teardown() {
      for (const unsub of unsubs.splice(0)) unsub();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    async function boot() {
      if (booting) return;
      booting = true;
      try {
        const { data } = await client!.auth.getSession();
        const userId = data.session?.user?.id;
        // No session (e.g. sitting on /login): proxy redirects; stay quiet.
        if (!userId || cancelled) return;
        teardown();
        setStatus("loading");
        try {
          const b = useBudgetStore.getState();
          const c = useCompanyStore.getState();
          await initialSync({
            budgets: supabaseBudgetIo(client!),
            company: supabaseCompanyIo(client!),
            userId,
            localBudgets: { budgets: b.budgets, order: b.order, activeId: b.activeId },
            localProfile: c.profile,
            applyBudgets: (doc) =>
              useBudgetStore.setState({ budgets: doc.budgets, order: doc.order, activeId: doc.activeId }),
            applyProfile: (profile) => useCompanyStore.setState({ profile }),
            clearBudgets: () => useBudgetStore.setState({ budgets: {}, order: [], activeId: null }),
            clearProfile: () => useCompanyStore.setState({ profile: emptyCompany() }),
          });
        } catch {
          if (!cancelled) setStatus("error");
          return;
        }
        if (cancelled) return;
        setStatus("synced");
        // Subscribe only after the initial reconciliation, so the pull
        // itself never echoes back as a push.
        unsubs.push(useBudgetStore.subscribe(schedulePush), useCompanyStore.subscribe(schedulePush));
      } finally {
        booting = false;
      }
    }

    void boot();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void boot();
      if (event === "SIGNED_OUT") {
        teardown();
        setStatus("local");
      }
    });

    return () => {
      cancelled = true;
      teardown();
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
