import { AccountLoader } from "@/components/budget/AccountLoader";

export default function Account() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AccountLoader section="account" />
    </main>
  );
}
