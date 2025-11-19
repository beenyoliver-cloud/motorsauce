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
        
        console.log("[BusinessStorefront] Fetching profile for ID:", profileId);
        
        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email, avatar, account_type, business_verified, total_sales, avg_response_time_minutes, response_rate, created_at")
          .eq("id", profileId)
          .single();

        console.log("[BusinessStorefront] Profile fetch result:", { profile, profileError });

        if (profileError || !profile) {
          console.error("Error fetching profile:", profileError);
          setError(`Failed to load profile: ${profileError?.message || 'Unknown error'}`);
          return;
        }

        // Fetch business_info
        const { data: businessInfo, error: businessError } = await supabase
          .from("business_info")
          .select("*")
          .eq("profile_id", profileId)
          .single();

        console.log("[BusinessStorefront] Business info fetch result:", { businessInfo, businessError });

        if (businessError || !businessInfo) {
          console.error("Error fetching business info:", businessError);
          setError(`Business information not found: ${businessError?.message || 'No data'}`);
          return;
        }

        // Fetch reviews for ratings
        const { data: reviews } = await supabase
          .from("business_reviews")
          .select("rating")
          .eq("business_profile_id", profileId)
          .eq("admin_approved", true)
          .eq("flagged", false);

        const reviewCount = reviews?.length || 0;
        const avgRating = reviewCount > 0 && reviews
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;

        const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews?.forEach(r => {
          if (r.rating >= 1 && r.rating <= 5) {
            ratingCounts[r.rating as keyof typeof ratingCounts]++;
          }
        });

        // Combine into BusinessProfile
        const businessProfile: BusinessProfile = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatar: profile.avatar,
          business_verified: profile.business_verified || false,
          total_sales: profile.total_sales || 0,
          avg_response_time_minutes: profile.avg_response_time_minutes,
          response_rate: profile.response_rate,
          member_since: profile.created_at,
          business_name: businessInfo.business_name,
          business_type: businessInfo.business_type,
          logo_url: businessInfo.logo_url,
          banner_url: businessInfo.banner_url,
          phone_number: businessInfo.phone_number,
          website_url: businessInfo.website_url,
          customer_support_email: businessInfo.customer_support_email,
          opening_hours: businessInfo.opening_hours,
          customer_service_hours: businessInfo.customer_service_hours,
          about_business: businessInfo.about_business,
          specialties: businessInfo.specialties || [],
          years_established: businessInfo.years_established,
          avg_rating: avgRating,
          review_count: reviewCount,
          five_star_count: ratingCounts[5],
          four_star_count: ratingCounts[4],
          three_star_count: ratingCounts[3],
          two_star_count: ratingCounts[2],
          one_star_count: ratingCounts[1],
        };

        console.log("[BusinessStorefront] Successfully built business profile:", businessProfile);
        setBusinessProfile(businessProfile);
      } catch (err) {
        console.error("[BusinessStorefront] Unexpected error:", err);
        setError(`An error occurred: ${err instanceof Error ? err.message : String(err)}`);
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
