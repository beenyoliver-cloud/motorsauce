// src/app/profile/todos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import TodoList from "@/components/TodoList";

export default function TodosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = supabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace("/auth/login?next=/profile/todos");
        return;
      }
      
      setAuthenticated(true);
      setLoading(false);
    }
    
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <TodoList />
      </div>
    </div>
  );
}
