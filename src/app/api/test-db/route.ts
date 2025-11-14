import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const info = {
    hasUrl: !!url,
    hasServiceRole: !!serviceKey,
    hasAnonKey: !!anonKey,
    urlPrefix: url?.substring(0, 20),
    serviceKeyPrefix: serviceKey?.substring(0, 20),
    anonKeyPrefix: anonKey?.substring(0, 20),
  };

  try {
    const supabase = createClient(
      url!,
      serviceKey || anonKey!,
      { auth: { persistSession: false } }
    );

    const { data, error, count } = await supabase
      .from("listings")
      .select("id, title", { count: "exact" })
      .limit(5);

    return NextResponse.json({
      info,
      usingKey: serviceKey ? "SERVICE_ROLE" : "ANON",
      query: {
        success: !error,
        error: error?.message,
        hint: error?.hint,
        count,
        sampleTitles: data?.map(d => d.title) || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      info,
      error: err.message,
    }, { status: 500 });
  }
}
