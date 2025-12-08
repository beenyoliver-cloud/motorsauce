import StandaloneOffersPage from "@/components/StandaloneOffersPage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function OffersPage() {
  // Just render the client component - it will handle auth checks
  return <StandaloneOffersPage />;
}
