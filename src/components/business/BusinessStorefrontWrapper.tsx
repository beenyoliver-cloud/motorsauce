"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import BusinessStorefront, { BusinessProfile } from "./BusinessStorefront";
import { Loader2 } from "lucide-react";

type Props = {
  profileId: string;
  displayName: string;
  isOwner?: boolean;
};

export default function BusinessStorefrontWrapper({ profileId, displayName, isOwner = false }: Props) {
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBusinessProfile() {
      try {
        const supabase = supabaseBrowser();
        
        // Fetch from business_profiles_public view
        const { data, error } = await supabase
          .from("business_profiles_public")
          .select("*")
          .eq("id", profileId)
          .single();

        if (error) {
          console.error("Error fetching business profile:", error);
          setError("Failed to load business profile");
          return;
        }

        if (!data) {
          setError("Business profile not found");
          return;
        }

        setBusinessProfile(data as BusinessProfile);
      } catch (err) {
        console.error("Error:", err);
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchBusinessProfile();
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error || !businessProfile) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
        <p className="text-gray-600">{error || "Business profile not available"}</p>
      </div>
    );
  }

  return <BusinessStorefront business={businessProfile} isOwner={isOwner} />;
}
