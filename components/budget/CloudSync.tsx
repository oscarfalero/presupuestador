"use client";

import { useEffect } from "react";
import { getBrowserClient, isCloudEnabled } from "@/lib/supabase";
import { useSyncStore } from "@/lib/sync-status";
import { initialSync, supabaseBudgetIo, supabaseCompanyIo } from "@/lib/cloud";
import { useBudgetStore } from "@/lib/store";
import { useCompanyStore } from "@/lib/company";

const PUSH_DEBOUNCE_MS = 800;

/**
 * Invisible bridge between the local zustand stores and Supabase.
 * Mounted once per route (see the loaders). No-op without cloud env.
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
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribed = false;
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

    async function boot() {
      const { data } = await client!.auth.getSession();
      const userId = data.session?.user?.id;
      // No session (e.g. /login): proxy redirects; stay local and quiet.
      if (!userId || cancelled) return;
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
        });
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      if (cancelled) return;
      setStatus("synced");
      // Subscribe only after the initial reconciliation, so the pull
      // itself never echoes back as a push.
      unsubs.push(
        useBudgetStore.subscribe(schedulePush),
        useCompanyStore.subscribe(schedulePush),
      );
    }

    void boot();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        unsubscribed = true;
        for (const unsub of unsubs.splice(0)) unsub();
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        setStatus("local");
      }
      if (event === "SIGNED_IN" && unsubscribed) {
        unsubscribed = false;
        void boot();
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      for (const unsub of unsubs.splice(0)) unsub();
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
