import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotificationServer } from "@/lib/notificationsServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const PLACEHOLDER_SUFFIXES = ["/images/placeholder.jpg", "/images/placeholder.png"];

type ImageCheck = { url: string; valid: boolean };

function normalizeImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((value) => {
      if (typeof value === "string") return value.trim();
      if (value && typeof value === "object" && "url" in value) {
        const maybeUrl = (value as { url?: unknown }).url;
        return typeof maybeUrl === "string" ? maybeUrl.trim() : "";
      }
      return "";
    })
    .filter((url) => url.length > 0);
}

function stripQuery(url: string) {
  return url.split("?")[0]?.split("#")[0] || url;
}

function isPlaceholderUrl(url: string): boolean {
  const base = stripQuery(url).toLowerCase();
  return PLACEHOLDER_SUFFIXES.some((suffix) => base.endsWith(suffix));
}

function isHttpUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function isDataUrl(url: string) {
  return url.startsWith("data:image/");
}

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

async function validateImageUrl(url: string): Promise<ImageCheck> {
  if (!url) return { url, valid: false };
  if (isPlaceholderUrl(url)) return { url, valid: false };
  if (isDataUrl(url)) return { url, valid: true };
  if (!isHttpUrl(url)) {
    return { url, valid: url.startsWith("/") };
  }
  return { url, valid: await isImageAccessible(url) };
}

async function notifySeller(listing: { seller_id?: string | null; id: string | number; title?: string | null }, reason: string) {
  if (!listing.seller_id) return;
  const title = listing.title ? `"${listing.title}"` : "a listing";
  const message = `We couldn't load one or more images for ${title}. ${reason} Update the images and republish to make it live again.`;
  await createNotificationServer({
    userId: listing.seller_id,
    type: "listing_image_issue",
    title: "Listing moved to drafts",
    message,
    link: `/listing/${listing.id}/edit`,
  });
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

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If validateAll is true, validate all active listings
    if (validateAll === true) {
      const { data: listings, error: fetchError } = await supabase
        .from("listings")
        .select("id, title, images, status, seller_id, images_validation_failed")
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
        const images = normalizeImageUrls(listing.images);
        const hasImages = images.length > 0;
        const checks = hasImages ? await Promise.all(images.map(validateImageUrl)) : [];
        const broken = checks.filter((c) => !c.valid);
        const allValid = hasImages && broken.length === 0;
        const now = new Date().toISOString();

        const updateData: Record<string, unknown> = {
          images_validated_at: now,
          images_validation_failed: !allValid,
        };

        if (!allValid && listing.status === "active") {
          updateData.status = "draft";
          updateData.draft_reason = hasImages
            ? `${broken.length} image(s) failed validation. Please replace them.`
            : "No images found. Add at least one image to publish this listing.";
        }

        const { error: updateError } = await supabase
          .from("listings")
          .update(updateData)
          .eq("id", listing.id);

        if (!updateError) {
          if (!allValid && listing.status === "active") {
            results.drafted.push(listing.id);
            results.failed++;
            if (!listing.images_validation_failed) {
              try {
                await notifySeller(listing, hasImages ? "Replace the broken image(s)." : "Add at least one image.");
              } catch (err) {
                console.error("[validate-images] Notify seller failed:", err);
              }
            }
          } else {
            results.validated++;
          }
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
      .select("id, title, images, status, seller_id, images_validation_failed")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const images = normalizeImageUrls(listing.images);
    const hasImages = images.length > 0;
    const validationResults = hasImages ? await Promise.all(images.map(validateImageUrl)) : [];
    const brokenImages = validationResults.filter((v) => !v.valid);
    const allValid = hasImages && brokenImages.length === 0;

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      images_validated_at: now,
      images_validation_failed: !allValid,
    };

    if (!allValid && listing.status === "active") {
      updateData.status = "draft";
      updateData.draft_reason = hasImages
        ? `${brokenImages.length} image(s) failed validation. Please replace them.`
        : "No images found. Add at least one image to publish this listing.";
    }

    const { error: updateError } = await supabase
      .from("listings")
      .update(updateData)
      .eq("id", listingId);

    if (updateError) {
      console.error("Error updating listing image validation:", updateError);
      return NextResponse.json(
        { error: "Failed to update listing" },
        { status: 500 }
      );
    }

    if (!allValid && listing.status === "active" && !listing.images_validation_failed) {
      try {
        await notifySeller(listing, hasImages ? "Replace the broken image(s)." : "Add at least one image.");
      } catch (err) {
        console.error("[validate-images] Notify seller failed:", err);
      }
    }

    return NextResponse.json({
      valid: allValid,
      validatedAt: new Date().toISOString(),
      images: validationResults,
      autoDrafted: !allValid && listing.status === "active",
      brokenImages: brokenImages.map((v) => v.url),
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
