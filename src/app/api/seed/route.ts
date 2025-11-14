import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST() {
  const supabase = supabaseServer();

  try {
    // Check if we already have listings
    const { count } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return NextResponse.json(
        { message: `Database already has ${count} listings. Skipping seed.` },
        { status: 200 }
      );
    }

    // Get the current user or use a default seller
    const { data: { user } } = await supabase.auth.getUser();
    
    // If no user, try to get any profile from the database
    let sellerId = user?.id;
    if (!sellerId) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .limit(1)
        .single();
      sellerId = profiles?.id;
    }

    if (!sellerId) {
      return NextResponse.json(
        { error: "No seller profile found. Please create a user account first." },
        { status: 400 }
      );
    }

    // Sample listings to seed
    const sampleListings = [
      {
        seller_id: sellerId,
        title: "Brembo Brake Pads - Front",
        description: "High-performance brake pads for track and street use. Fits most BMW 3 Series models.",
        price: 89.99,
        condition: "New",
        category: "Aftermarket",
        make: "BMW",
        model: "3 Series",
        year: 2018,
        images: ["/images/placeholder.jpg"],
      },
      {
        seller_id: sellerId,
        title: "OEM Air Filter",
        description: "Genuine OEM air filter. New in sealed box.",
        price: 24.50,
        condition: "New",
        category: "OEM",
        make: "Toyota",
        model: "Corolla",
        year: 2015,
        images: ["/images/placeholder.jpg"],
      },
      {
        seller_id: sellerId,
        title: "BC Racing Coilovers",
        description: "Adjustable coilover suspension. Excellent condition, recently serviced.",
        price: 450.00,
        condition: "Used - Like New",
        category: "Aftermarket",
        make: "Honda",
        model: "Civic",
        year: 2016,
        images: ["/images/placeholder.jpg"],
      },
      {
        seller_id: sellerId,
        title: "Milltek Exhaust System",
        description: "Cat-back stainless steel exhaust. Deep sound, minimal drone.",
        price: 750.00,
        condition: "Used - Good",
        category: "Aftermarket",
        make: "Audi",
        model: "A4",
        year: 2017,
        images: ["/images/placeholder.jpg"],
      },
      {
        seller_id: sellerId,
        title: "Spark Plugs Set",
        description: "NGK iridium spark plugs. Set of 4. Brand new.",
        price: 18.99,
        condition: "New",
        category: "OEM",
        make: "Mazda",
        model: "MX-5",
        year: 2019,
        images: ["/images/placeholder.jpg"],
      },
      {
        seller_id: sellerId,
        title: "K&N Air Intake Kit",
        description: "Cold air intake with washable filter. Easy installation.",
        price: 199.99,
        condition: "Used - Like New",
        category: "Aftermarket",
        make: "Ford",
        model: "Mustang",
        year: 2020,
        images: ["/images/placeholder.jpg"],
      },
      {
        seller_id: sellerId,
        title: "OEM Brake Discs - Rear",
        description: "Genuine rear brake discs. Never fitted, surplus from job.",
        price: 65.00,
        condition: "New",
        category: "OEM",
        make: "VW",
        model: "Golf",
        year: 2014,
        images: ["/images/placeholder.jpg"],
      },
      {
        seller_id: sellerId,
        title: "Oil Filter Wrench Set",
        description: "Professional oil filter wrench set with various sizes.",
        price: 12.99,
        condition: "New",
        category: "Tool",
        images: ["/images/placeholder.jpg"],
      },
    ];

    const { data, error } = await supabase
      .from("listings")
      .insert(sampleListings)
      .select();

    if (error) {
      console.error("Seed error:", error);
      return NextResponse.json(
        { error: "Failed to seed database", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: `Successfully seeded ${data?.length || 0} listings`, data },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { error: "Seed failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
