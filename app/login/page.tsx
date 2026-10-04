"use client";

import { LoginForm } from "@/components/budget/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <LoginForm />
    </main>
  );
}
