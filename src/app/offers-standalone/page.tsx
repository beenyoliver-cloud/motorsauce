import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import StandaloneOffersPage from "@/components/StandaloneOffersPage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function OffersPage() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect("/auth/login?next=/offers-standalone");
    }

    return <StandaloneOffersPage />;
  } catch (error) {
    console.error("[OffersPage] Error:", error);
    // Return a safe fallback
    redirect("/auth/login");
  }
}
