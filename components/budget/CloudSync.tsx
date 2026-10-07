"use client";

import { useEffect } from "react";
import { getBrowserClient, isCloudEnabled } from "@/lib/supabase";
import { useSyncStore } from "@/lib/sync-status";
import {
  deletedSince,
  initialSync,
  supabaseBudgetIo,
  supabaseCompanyIo,
  unseenBudgets,
  type BudgetDoc,
} from "@/lib/cloud";
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
    // What we believe the cloud holds (issue #52). Updated on every
    // pull/push; pushes merge against it so a stale tab can never
    // clobber budgets it never saw. Deletes propagate only for ids
    // present here but gone locally.
    let lastSynced: BudgetDoc | null = null;

    async function pushNow() {
      const { data } = await client!.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || cancelled) return;
      setStatus("saving");
      try {
        const b = useBudgetStore.getState();
        const c = useCompanyStore.getState();
        const current: BudgetDoc = { budgets: b.budgets, order: b.order, activeId: b.activeId };
        const written = await supabaseBudgetIo(client!).saveMerged(
          userId,
          current,
          deletedSince(lastSynced, current),
        );
        lastSynced = written;
        // Pull cloud-only budgets into the store: without this, the next
        // push would read them as local deletes and wipe them (issue #52).
        // Converges: the follow-up push finds nothing new and stops.
        const unseen = unseenBudgets(current, written);
        if (unseen && !cancelled) {
          useBudgetStore.setState({
            budgets: unseen.budgets,
            order: unseen.order,
            activeId: unseen.activeId,
          });
        }
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
        const synced = useBudgetStore.getState();
        lastSynced = { budgets: synced.budgets, order: synced.order, activeId: synced.activeId };
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
        lastSynced = null;
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
