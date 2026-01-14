// src/app/api/listings/[id]/validate-images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotificationServer } from "@/lib/notificationsServer";

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

async function validateImageUrl(url: string): Promise<ImageCheck> {
  if (!url) return { url, valid: false };
  if (isPlaceholderUrl(url)) return { url, valid: false };
  if (isDataUrl(url)) return { url, valid: true };
  if (!isHttpUrl(url)) {
    return { url, valid: url.startsWith("/") };
  }
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    return {
      url,
      valid: response.ok && (response.headers.get("content-type")?.startsWith("image/") ?? false),
    };
  } catch {
    return { url, valid: false };
  }
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

// Validate that all images in a listing are accessible
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get listing
    const { data: listing, error: fetchError } = await supabase
      .from("listings")
      .select("id, title, images, seller_id, status, images_validation_failed")
      .eq("id", id)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const images = normalizeImageUrls(listing.images);
    const hasImages = images.length > 0;
    const imageChecks = hasImages ? await Promise.all(images.map(validateImageUrl)) : [];
    const validImages = imageChecks.filter((check) => check.valid);
    const allValid = hasImages && validImages.length === imageChecks.length;

    const updateData: Record<string, unknown> = {
      images_validated_at: new Date().toISOString(),
      images_validation_failed: !allValid,
    };

    if (!allValid && listing.status === "active") {
      updateData.status = "draft";
      updateData.draft_reason = hasImages
        ? `${imageChecks.length - validImages.length} image(s) are not accessible. Please replace them.`
        : "No images found. Add at least one image to publish this listing.";
    }

    await supabase
      .from("listings")
      .update(updateData)
      .eq("id", id);

    if (!allValid && listing.status === "active" && !listing.images_validation_failed) {
      try {
        await notifySeller(listing, hasImages ? "Replace the broken image(s)." : "Add at least one image.");
      } catch (err) {
        console.error("[validate-images] Notify seller failed:", err);
      }
    }

    return NextResponse.json({
      valid: allValid,
      images_checked: imageChecks.length,
      images_valid: validImages.length,
      images_invalid: imageChecks.length - validImages.length,
      invalid_urls: imageChecks.filter((c) => !c.valid).map((c) => c.url),
      autoDrafted: !allValid && listing.status === "active",
    });
  } catch (error) {
    console.error("Error validating images:", error);
    return NextResponse.json({ error: "Failed to validate images" }, { status: 500 });
  }
}
