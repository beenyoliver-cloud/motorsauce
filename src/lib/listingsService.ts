import { supabaseBrowser } from './supabase';

export type Vehicle = {
  make: string;
  model: string;
  year?: number | null;
  universal?: boolean; // true for generic/tool parts that fit all vehicles
};

export type Listing = {
  id: string;
  title: string;
  // price can be stored as a number (pound amount) or a formatted string like "£120"
  price?: number | string;
  image?: string;
  images?: string[];
  category?: string;
  part_type?: string;
  main_category?: string;
  condition?: string;
  // Multi-vehicle support (new)
  vehicles?: Vehicle[];
  // Backward compatibility (keep old fields)
  make?: string;
  model?: string;
  year?: number;
  quantity?: number;
  postcode?: string;
  shipping_option?: string;
  accepts_returns?: boolean;
  return_days?: number;
  description?: string;
  createdAt?: string;
  ownerId?: string;
  seller_id?: string; // Add seller_id from database
  seller?: { name?: string; avatar?: string; rating?: number };
  // New listing management fields
  status?: 'active' | 'draft' | 'sold';
  draft_reason?: string;
  marked_sold_at?: string;
  seller_postcode?: string;
  seller_lat?: number | null;
  seller_lng?: number | null;
  images_validated_at?: string;
  images_validation_failed?: boolean;
};

const client = () => supabaseBrowser();

export async function getListings(): Promise<Listing[]> {
  const supa = client();
  const { data, error } = await supa
    .from('listings')
    .select(`
      *,
      seller:profiles!seller_id (
        name,
        avatar
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return (data ?? []).map(item => {
    // Handle seller data (could be object or array depending on Supabase version)
    const sellerData = Array.isArray(item.seller) ? item.seller[0] : item.seller;
    
    return {
      ...item,
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price),
      images: Array.isArray(item.images) ? item.images : [],
      seller: {
        name: sellerData?.name,
        avatar: sellerData?.avatar
      }
    };
  });
}

export async function getListingById(id: string): Promise<Listing | null> {
  const supa = client();
  console.log('[getListingById] Fetching listing:', id);
  
  const { data, error } = await supa
    .from('listings')
    .select(`
      *,
      seller:profiles!seller_id (
        name,
        avatar
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getListingById] Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      listingId: id
    });
    return null;
  }

  if (!data) {
    console.warn('[getListingById] No data returned for listing:', id);
    return null;
  }

  console.log('[getListingById] Successfully fetched listing:', data.id, data.title);

  // Handle seller data (could be object or array depending on Supabase version)
  const sellerData = Array.isArray(data.seller) ? data.seller[0] : data.seller;

  return {
    ...data,
    price: typeof data.price === 'number' ? data.price : parseFloat(data.price),
    images: Array.isArray(data.images) ? data.images : [],
    seller: {
      name: sellerData?.name,
      avatar: sellerData?.avatar
    }
  };
}

export async function createListing(payload: Partial<Listing>): Promise<Listing> {
  const supa = client();
  
  // Get the current user's ID for seller_id
  const { data: { user } } = await supa.auth.getUser();
  if (!user) throw new Error('Must be logged in to create a listing');

  const listingData = {
    ...payload,
    seller_id: user.id,
    images: payload.images || []
  };

  const { data, error } = await supa
    .from('listings')
    .insert(listingData)
    .select(`
      *,
      seller:profiles!seller_id (
        name,
        avatar
      )
    `)
    .single();

  if (error) throw error;

  // Handle seller data (could be object or array depending on Supabase version)
  const sellerData = Array.isArray(data.seller) ? data.seller[0] : data.seller;

  return {
    ...data,
    price: typeof data.price === 'number' ? data.price : parseFloat(data.price),
    images: Array.isArray(data.images) ? data.images : [],
    seller: {
      name: sellerData?.name,
      avatar: sellerData?.avatar
    }
  };
}

export async function updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
  const supa = client();
  
  // Get the current user's ID to verify ownership
  const { data: { user } } = await supa.auth.getUser();
  if (!user) throw new Error('Must be logged in to update a listing');

  const { data, error } = await supa
    .from('listings')
    .update(updates)
    .eq('id', id)
    .eq('seller_id', user.id) // Ensure user owns the listing
    .select(`
      *,
      seller:profiles!seller_id (
        name,
        avatar
      )
    `)
    .single();

  if (error) throw error;

  // Handle seller data (could be object or array depending on Supabase version)
  const sellerData = Array.isArray(data.seller) ? data.seller[0] : data.seller;

  return {
    ...data,
    price: typeof data.price === 'number' ? data.price : parseFloat(data.price),
    images: Array.isArray(data.images) ? data.images : [],
    seller: {
      name: sellerData?.name,
      avatar: sellerData?.avatar
    }
  };
}

export async function deleteListing(id: string): Promise<void> {
  const supa = client();
  const { error } = await supa.from('listings').delete().eq('id', id);
  if (error) throw error;
}
