import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SavedSearchesList from "@/components/SavedSearchesList";

export const dynamic = "force-dynamic";

export default async function SavedSearchesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=/saved-searches");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <SavedSearchesList userId={user.id} />
      </div>
    </div>
  );
}
