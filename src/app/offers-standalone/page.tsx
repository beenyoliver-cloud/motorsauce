import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import StandaloneOffersPage from "@/components/StandaloneOffersPage";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?next=/offers");
  }

  return <StandaloneOffersPage />;
}
