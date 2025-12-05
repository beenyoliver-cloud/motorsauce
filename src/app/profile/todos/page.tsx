// src/app/profile/todos/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import TodoList from "@/components/TodoList";

export default async function TodosPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/login?next=/profile/todos");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <TodoList />
      </div>
    </div>
  );
}
