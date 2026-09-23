import { BudgetsLoader } from "@/components/budget/BudgetsLoader";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <BudgetsLoader />
    </main>
  );
}
