import { BudgetEditorLoader } from "@/components/budget/BudgetEditorLoader";

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <BudgetEditorLoader budgetId={id} />
    </main>
  );
}
