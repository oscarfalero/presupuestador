"use client";

import { useEffect } from "react";
import { getBrowserClient, isCloudEnabled } from "@/lib/supabase";
import { useSyncStore } from "@/lib/sync-status";
import {
  deletedSince,
  initialSync,
  planPush,
  supabaseBudgetIo,
  supabaseCompanyIo,
  unseenBudgets,
  type BudgetDoc,
} from "@/lib/cloud";
import { useBudgetStore } from "@/lib/store";
import { emptyCompany, useCompanyStore, type CompanyProfile } from "@/lib/company";

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
    let lastSyncedProfile: CompanyProfile | null = null;

    async function pushNow() {
      const { data } = await client!.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || cancelled) return;
      const b = useBudgetStore.getState();
      const c = useCompanyStore.getState();
      const current: BudgetDoc = { budgets: b.budgets, order: b.order, activeId: b.activeId };
      // Issue #57: a load (or a hydration echo, or the convergence
      // follow-up) with no new changes must not upload anything — and
      // must not flash "saving" either. Each store saves independently.
      const plan = planPush(lastSynced, current, lastSyncedProfile, c.profile);
      if (!plan.saveBudgets && !plan.saveProfile) {
        // Only an error state is repaired here (state == last successful
        // write, so "synced" is honest). Never touch saving/loading: an
        // overlapping push may still be in flight.
        if (!cancelled && useSyncStore.getState().status === "error") setStatus("synced");
        return;
      }
      setStatus("saving");
      try {
        if (plan.saveBudgets) {
          const written = await supabaseBudgetIo(client!).saveMerged(
            userId,
            current,
            deletedSince(lastSynced, current),
          );
          lastSynced = written;
          // Pull cloud-only budgets into the store: without this, the next
          // push would read them as local deletes and wipe them (issue #52).
          // Built from FRESH store state (not the pre-await snapshot):
          // edits made while the save was in flight must survive, and ids
          // removed meanwhile are genuine deletes that must not come back.
          // Converges silently now: the follow-up push plans no saves (#57).
          const fresh = useBudgetStore.getState();
          const freshDoc: BudgetDoc = {
            budgets: fresh.budgets,
            order: fresh.order,
            activeId: fresh.activeId,
          };
          const removedDuringFlight = new Set(
            [...current.order, ...Object.keys(current.budgets)].filter(
              (id) => !freshDoc.budgets[id] && !freshDoc.order.includes(id),
            ),
          );
          const unseen = unseenBudgets(freshDoc, written, removedDuringFlight);
          if (unseen && !cancelled) {
            useBudgetStore.setState({
              budgets: unseen.budgets,
              order: unseen.order,
              activeId: unseen.activeId,
            });
          }
        }
        if (plan.saveProfile) {
          await supabaseCompanyIo(client!).save(userId, c.profile);
          lastSyncedProfile = c.profile;
        }
        if (!plan.saveBudgets) {
          // Read-only refresh: this tab only changed the company profile,
          // but another device may have added budgets meanwhile. Pull
          // unseen ones into view WITHOUT writing (no updated_at churn,
          // no "saving" flash — the status stays honest). Safe without
          // delete handling: unchanged budgets mean nothing new was
          // deleted locally, so everything unseen is genuinely new.
          const cloud = await supabaseBudgetIo(client!).load(userId);
          if (cloud && !cancelled) {
            const fresh = useBudgetStore.getState();
            const freshDoc: BudgetDoc = {
              budgets: fresh.budgets,
              order: fresh.order,
              activeId: fresh.activeId,
            };
            // Same in-flight guard as the save path: ids removed while
            // the load was travelling are genuine deletes — re-adding
            // them would silently undo the user's delete.
            const removedDuringFlight = new Set(
              [...current.order, ...Object.keys(current.budgets)].filter(
                (id) => !freshDoc.budgets[id] && !freshDoc.order.includes(id),
              ),
            );
            const unseen = unseenBudgets(freshDoc, cloud, removedDuringFlight);
            if (unseen) {
              useBudgetStore.setState({
                budgets: unseen.budgets,
                order: unseen.order,
                activeId: unseen.activeId,
              });
              // Baseline becomes the freshly read cloud doc: if another
              // device edited a shared budget meanwhile, the follow-up
              // push sees the difference and converges (local wins).
              lastSynced = cloud;
            }
          }
        }
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
        lastSyncedProfile = useCompanyStore.getState().profile;
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
        lastSyncedProfile = null;
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
