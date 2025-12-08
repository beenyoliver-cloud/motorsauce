import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE!;

/**
 * Validate if an image URL is accessible
 * @param url Image URL to check
 * @returns true if accessible, false otherwise
 */
async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: "HEAD", // Only fetch headers, not the full image
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check if response is OK and content-type is an image
    if (!response.ok) return false;

    const contentType = response.headers.get("content-type");
    return contentType?.startsWith("image/") ?? false;
  } catch (error) {
    console.error(`Image validation failed for ${url}:`, error);
    return false;
  }
}

/**
 * Validate images for a listing and auto-draft if broken
 * POST /api/listings/validate-images
 * Body: { listingId: string }
 * 
 * This endpoint can be called:
 * 1. Manually by admins/sellers
 * 2. On a CRON schedule via Vercel Cron or external service
 * 3. When a listing is created/updated
 */
export async function POST(req: NextRequest) {
  try {
    const { listingId, validateAll } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If validateAll is true, validate all active listings
    if (validateAll === true) {
      const { data: listings, error: fetchError } = await supabase
        .from("listings")
        .select("id, images, status")
        .eq("status", "active");

      if (fetchError) {
        return NextResponse.json(
          { error: "Failed to fetch listings" },
          { status: 500 }
        );
      }

      const results = {
        total: listings?.length || 0,
        validated: 0,
        failed: 0,
        drafted: [] as string[],
      };

      for (const listing of listings || []) {
        const images = listing.images || [];
        if (images.length === 0) {
          results.validated++;
          continue;
        }

        // Check all images
        const validationResults = await Promise.all(
          images.map((img: string) => isImageAccessible(img))
        );

        const allValid = validationResults.every((v) => v);

        if (!allValid) {
          // Mark as draft
          const { error: updateError } = await supabase
            .from("listings")
            .update({
              status: "draft",
              draft_reason: "Some images may be broken or inaccessible. Please review and update.",
              images_validation_failed: true,
              images_validated_at: new Date().toISOString(),
            })
            .eq("id", listing.id);

          if (!updateError) {
            results.drafted.push(listing.id);
            results.failed++;
          }
        } else {
          // Update validation timestamp
          await supabase
            .from("listings")
            .update({
              images_validated_at: new Date().toISOString(),
              images_validation_failed: false,
            })
            .eq("id", listing.id);

          results.validated++;
        }
      }

      return NextResponse.json(results);
    }

    // Validate single listing
    if (!listingId) {
      return NextResponse.json(
        { error: "Missing listingId" },
        { status: 400 }
      );
    }

    // Fetch listing
    const { data: listing, error: fetchError } = await supabase
      .from("listings")
      .select("id, images, status, seller_id")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const images = listing.images || [];

    if (images.length === 0) {
      return NextResponse.json({
        valid: true,
        message: "No images to validate",
      });
    }

    // Check all images
    const validationResults = await Promise.all(
      images.map(async (img: string) => ({
        url: img,
        accessible: await isImageAccessible(img),
      }))
    );

    const allValid = validationResults.every((v) => v.accessible);
    const brokenImages = validationResults.filter((v) => !v.accessible);

    // If any images are broken and listing is active, auto-draft it
    if (!allValid && listing.status === "active") {
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          status: "draft",
          draft_reason: `${brokenImages.length} image(s) failed validation. Please review and re-upload.`,
          images_validation_failed: true,
          images_validated_at: new Date().toISOString(),
        })
        .eq("id", listingId);

      if (updateError) {
        console.error("Error auto-drafting listing:", updateError);
        return NextResponse.json(
          { error: "Failed to update listing" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        valid: false,
        autoDrafted: true,
        brokenImages: brokenImages.map((v) => v.url),
        message: "Listing auto-drafted due to broken images",
      });
    }

    // Update validation timestamp
    await supabase
      .from("listings")
      .update({
        images_validated_at: new Date().toISOString(),
        images_validation_failed: !allValid,
      })
      .eq("id", listingId);

    return NextResponse.json({
      valid: allValid,
      validatedAt: new Date().toISOString(),
      images: validationResults,
    });
  } catch (error) {
    console.error("Error in validate-images API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for CRON jobs
 * GET /api/listings/validate-images?cron_secret=YOUR_SECRET
 * 
 * Set up in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/listings/validate-images?cron_secret=YOUR_SECRET",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cronSecret = searchParams.get("cron_secret");

  // Verify CRON secret
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger validation for all listings
  const response = await POST(
    new NextRequest(req.url, {
      method: "POST",
      body: JSON.stringify({ validateAll: true }),
    })
  );

  return response;
}
