import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import OffersManagement from "@/components/OffersManagement";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=/offers");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <OffersManagement userId={user.id} />
      </div>
    </div>
  );
}
