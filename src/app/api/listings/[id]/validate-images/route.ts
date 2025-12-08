// src/app/api/listings/[id]/validate-images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Validate that all images in a listing are accessible
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get listing
    const { data: listing, error: fetchError } = await supabase
      .from("listings")
      .select("id, images, seller_id, status")
      .eq("id", id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (!listing.images || listing.images.length === 0) {
      // No images - mark as draft
      await supabase
        .from("listings")
        .update({
          status: "draft",
          draft_reason: "At least one image is required",
          images_validation_failed: true,
          images_validated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({
        valid: false,
        reason: "No images found",
        images_checked: 0,
        images_valid: 0,
      });
    }

    // Check each image URL
    const imageChecks = await Promise.all(
      listing.images.map(async (imageUrl: string) => {
        try {
          // Only validate http/https URLs
          if (!imageUrl.startsWith("http")) {
            return { url: imageUrl, valid: true }; // Data URLs or relative paths are OK
          }

          const response = await fetch(imageUrl, {
            method: "HEAD",
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });

          return {
            url: imageUrl,
            valid: response.ok && response.headers.get("content-type")?.startsWith("image/"),
          };
        } catch (error) {
          return { url: imageUrl, valid: false };
        }
      })
    );

    const validImages = imageChecks.filter((check) => check.valid);
    const allValid = validImages.length === imageChecks.length;

    // Update listing with validation results
    const updateData: any = {
      images_validated_at: new Date().toISOString(),
      images_validation_failed: !allValid,
    };

    // If images are invalid and listing is active, move to draft
    if (!allValid && listing.status === "active") {
      updateData.status = "draft";
      updateData.draft_reason = `${imageChecks.length - validImages.length} image(s) are not accessible`;
    }

    await supabase
      .from("listings")
      .update(updateData)
      .eq("id", id);

    return NextResponse.json({
      valid: allValid,
      images_checked: imageChecks.length,
      images_valid: validImages.length,
      images_invalid: imageChecks.length - validImages.length,
      invalid_urls: imageChecks.filter((c) => !c.valid).map((c) => c.url),
    });
  } catch (error) {
    console.error("Error validating images:", error);
    return NextResponse.json({ error: "Failed to validate images" }, { status: 500 });
  }
}
