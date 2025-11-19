# Business Storefront Implementation Plan

## Overview
Enable business users to register and operate professional storefronts on the Motorsauce marketplace, distinguishing them from individual sellers with enhanced features, branding, and trust indicators.

---

## 1. Database Schema Changes

### 1.1 Profiles Table Updates
```sql
-- Add account type column to existing profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'business'));

-- Add business metadata columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;
```

### 1.2 New Business Info Table
```sql
CREATE TABLE IF NOT EXISTS public.business_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Core Business Identity
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN (
    'oem_supplier',
    'breaker',
    'parts_retailer', 
    'performance_tuner',
    'restoration_specialist',
    'racing_team',
    'custom_fabricator',
    'other'
  )),
  
  -- Branding Assets
  logo_url TEXT, -- Supabase storage path
  banner_url TEXT, -- Supabase storage path
  
  -- Contact Information (some private)
  business_address JSONB, -- {street, city, postcode, country} - PRIVATE
  phone_number TEXT, -- Optional
  website_url TEXT, -- Optional, public
  customer_support_email TEXT, -- Optional
  
  -- Operating Hours
  opening_hours JSONB, -- {monday: {open: "09:00", close: "17:00", closed: false}, ...}
  customer_service_hours JSONB, -- Separate hours for customer service
  
  -- About Section
  about_business TEXT, -- Rich text/markdown
  specialties TEXT[], -- Array of specialties
  years_established INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_business_info_profile ON public.business_info(profile_id);
CREATE INDEX IF NOT EXISTS idx_business_info_type ON public.business_info(business_type);

-- RLS Policies
ALTER TABLE public.business_info ENABLE ROW LEVEL SECURITY;

-- Public read access (except private fields handled in view)
CREATE POLICY "Business info readable by anyone"
  ON public.business_info FOR SELECT
  USING (true);

-- Only profile owner can update
CREATE POLICY "Business owners can update their info"
  ON public.business_info FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Only profile owner can insert
CREATE POLICY "Profile owners can create business info"
  ON public.business_info FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
```

### 1.3 Promoted Items Table
```sql
CREATE TABLE IF NOT EXISTS public.promoted_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Promotion details
  promotion_type TEXT CHECK (promotion_type IN ('featured', 'new_arrival', 'sale', 'spotlight')),
  discount_percentage INTEGER, -- Optional, for sale items
  promotion_text TEXT, -- e.g., "20% OFF", "NEW", "FEATURED"
  
  -- Ordering and timing
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_profile_id, listing_id, promotion_type)
);

CREATE INDEX IF NOT EXISTS idx_promoted_items_business ON public.promoted_items(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_promoted_items_active ON public.promoted_items(active, ends_at);

ALTER TABLE public.promoted_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read active promotions
CREATE POLICY "Promotions readable by anyone"
  ON public.promoted_items FOR SELECT
  USING (true);

-- Only business owner can manage
CREATE POLICY "Business owners manage promotions"
  ON public.promoted_items FOR ALL
  USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = business_profile_id));
```

### 1.4 Business Reviews Table
```sql
CREATE TABLE IF NOT EXISTS public.business_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  
  -- Associated order/transaction (optional but recommended)
  order_id UUID, -- Could reference orders table
  
  -- Moderation
  verified_purchase BOOLEAN DEFAULT false,
  flagged BOOLEAN DEFAULT false,
  admin_approved BOOLEAN DEFAULT true,
  
  -- Response from business
  business_response TEXT,
  business_responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate reviews per transaction
  UNIQUE(business_profile_id, reviewer_profile_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_business_reviews_business ON public.business_reviews(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_reviews_rating ON public.business_reviews(rating);

ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for approved reviews
CREATE POLICY "Approved reviews readable by anyone"
  ON public.business_reviews FOR SELECT
  USING (admin_approved = true AND flagged = false);

-- Reviewers can create reviews
CREATE POLICY "Users can create reviews"
  ON public.business_reviews FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = reviewer_profile_id));

-- Business can respond to their reviews
CREATE POLICY "Business can respond to reviews"
  ON public.business_reviews FOR UPDATE
  USING (
    auth.uid() = (SELECT user_id FROM public.profiles WHERE id = business_profile_id)
    AND business_response IS NOT NULL
  );
```

### 1.5 Public Business View (GDPR-Safe)
```sql
-- Create a view that excludes private information
CREATE OR REPLACE VIEW public.business_profiles_public AS
SELECT 
  p.id,
  p.username,
  p.name,
  p.avatar_url,
  p.account_type,
  p.business_verified,
  p.total_sales,
  p.avg_response_time_minutes,
  p.response_rate,
  bi.business_name,
  bi.business_type,
  bi.logo_url,
  bi.banner_url,
  bi.phone_number,
  bi.website_url,
  bi.opening_hours,
  bi.customer_service_hours,
  bi.about_business,
  bi.specialties,
  bi.years_established,
  -- Calculate average rating from reviews
  COALESCE(AVG(br.rating), 0) as avg_rating,
  COUNT(DISTINCT br.id) as review_count
FROM public.profiles p
LEFT JOIN public.business_info bi ON bi.profile_id = p.id
LEFT JOIN public.business_reviews br ON br.business_profile_id = p.id AND br.admin_approved = true
WHERE p.account_type = 'business'
GROUP BY p.id, bi.id;
```

---

## 2. Registration Flow

### 2.1 Registration Page Updates (`src/app/auth/register/page.tsx`)

#### Account Type Selection
```typescript
// Add account type state
const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');

// UI for selection (shown first)
<div className="space-y-4">
  <h2>Choose Account Type</h2>
  <div className="grid grid-cols-2 gap-4">
    <button 
      onClick={() => setAccountType('individual')}
      className={accountType === 'individual' ? 'selected' : ''}
    >
      <User className="w-8 h-8" />
      <h3>Individual Seller</h3>
      <p>Perfect for selling personal items and parts</p>
    </button>
    
    <button 
      onClick={() => setAccountType('business')}
      className={accountType === 'business' ? 'selected' : ''}
    >
      <Building className="w-8 h-8" />
      <h3>Business Account</h3>
      <p>Full storefront with branding and advanced features</p>
    </button>
  </div>
</div>
```

### 2.2 Business Registration Fields
```typescript
// Additional state for business registration
const [businessData, setBusinessData] = useState({
  businessName: '',
  businessType: '',
  phone: '',
  website: '',
  aboutBusiness: '',
});

// Show conditional fields when account_type === 'business'
{accountType === 'business' && (
  <div className="space-y-4">
    <input
      required
      type="text"
      placeholder="Business Name *"
      value={businessData.businessName}
      onChange={(e) => setBusinessData({...businessData, businessName: e.target.value})}
    />
    
    <select
      required
      value={businessData.businessType}
      onChange={(e) => setBusinessData({...businessData, businessType: e.target.value})}
    >
      <option value="">Select Business Type *</option>
      <option value="oem_supplier">OEM Supplier</option>
      <option value="breaker">Breaker/Salvage Yard</option>
      <option value="parts_retailer">Parts Retailer</option>
      <option value="performance_tuner">Performance Tuner</option>
      <option value="restoration_specialist">Restoration Specialist</option>
      <option value="racing_team">Racing Team</option>
      <option value="custom_fabricator">Custom Fabricator</option>
      <option value="other">Other</option>
    </select>
    
    <input
      type="tel"
      placeholder="Business Phone (optional)"
      value={businessData.phone}
    />
    
    <input
      type="url"
      placeholder="Website (optional)"
      value={businessData.website}
    />
    
    <textarea
      placeholder="About Your Business (optional)"
      value={businessData.aboutBusiness}
      rows={4}
    />
    
    <div className="text-sm text-gray-600">
      ℹ️ You'll be able to add your logo, banner, opening hours, and business address after registration.
    </div>
  </div>
)}
```

### 2.3 Registration API Update (`src/app/api/auth/register/route.ts`)
```typescript
// After creating profile, if business account:
if (accountType === 'business') {
  const { error: businessError } = await supabase
    .from('business_info')
    .insert({
      profile_id: newProfile.id,
      business_name: businessName,
      business_type: businessType,
      phone_number: phone || null,
      website_url: website || null,
      about_business: aboutBusiness || null,
    });
    
  if (businessError) {
    console.error('Business info creation failed:', businessError);
    // Handle error
  }
}
```

---

## 3. Business Storefront Components

### 3.1 Component Structure
```
src/components/business/
├── BusinessStorefront.tsx          # Main storefront wrapper
├── BusinessHeader.tsx              # Banner, logo, business info
├── BusinessAbout.tsx               # About section
├── BusinessCatalogue.tsx           # Product listings grid
├── BusinessPromotions.tsx          # Featured/promoted items
├── BusinessNewArrivals.tsx         # Recently added items
├── BusinessReviews.tsx             # Customer reviews section
├── BusinessContact.tsx             # Contact info, hours, support
└── BusinessStats.tsx               # Sales count, response time, rating
```

### 3.2 BusinessStorefront Component (`src/components/business/BusinessStorefront.tsx`)
```typescript
'use client';

import { useState } from 'react';
import BusinessHeader from './BusinessHeader';
import BusinessStats from './BusinessStats';
import BusinessAbout from './BusinessAbout';
import BusinessPromotions from './BusinessPromotions';
import BusinessNewArrivals from './BusinessNewArrivals';
import BusinessCatalogue from './BusinessCatalogue';
import BusinessReviews from './BusinessReviews';
import BusinessContact from './BusinessContact';

type BusinessProfile = {
  id: string;
  username: string;
  business_name: string;
  business_type: string;
  logo_url: string | null;
  banner_url: string | null;
  about_business: string | null;
  website_url: string | null;
  avg_response_time_minutes: number | null;
  total_sales: number;
  avg_rating: number;
  review_count: number;
  // ... other fields
};

export default function BusinessStorefront({ 
  profile 
}: { 
  profile: BusinessProfile 
}) {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'about' | 'reviews'>('catalogue');
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with banner and logo */}
      <BusinessHeader profile={profile} />
      
      {/* Stats bar */}
      <BusinessStats 
        totalSales={profile.total_sales}
        avgRating={profile.avg_rating}
        reviewCount={profile.review_count}
        responseTime={profile.avg_response_time_minutes}
      />
      
      {/* Navigation tabs */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('catalogue')}
              className={`py-4 border-b-2 ${
                activeTab === 'catalogue' 
                  ? 'border-yellow-500 text-gray-900' 
                  : 'border-transparent text-gray-500'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`py-4 border-b-2 ${
                activeTab === 'about' 
                  ? 'border-yellow-500 text-gray-900' 
                  : 'border-transparent text-gray-500'
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 border-b-2 ${
                activeTab === 'reviews' 
                  ? 'border-yellow-500 text-gray-900' 
                  : 'border-transparent text-gray-500'
              }`}
            >
              Reviews ({profile.review_count})
            </button>
          </nav>
        </div>
      </div>
      
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'catalogue' && (
          <>
            {/* Promoted items section */}
            <BusinessPromotions businessId={profile.id} />
            
            {/* New arrivals */}
            <BusinessNewArrivals businessId={profile.id} />
            
            {/* Full catalogue */}
            <BusinessCatalogue businessId={profile.id} />
          </>
        )}
        
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <BusinessAbout profile={profile} />
            </div>
            <div>
              <BusinessContact profile={profile} />
            </div>
          </div>
        )}
        
        {activeTab === 'reviews' && (
          <BusinessReviews businessId={profile.id} />
        )}
      </div>
    </div>
  );
}
```

### 3.3 BusinessHeader Component
```typescript
'use client';

import SafeImage from '@/components/SafeImage';
import { MapPin, ExternalLink, Shield } from 'lucide-react';

export default function BusinessHeader({ profile }) {
  return (
    <div className="relative">
      {/* Banner Image */}
      <div className="h-64 bg-gradient-to-r from-gray-800 to-gray-600 relative">
        {profile.banner_url && (
          <SafeImage
            src={profile.banner_url}
            alt={`${profile.business_name} banner`}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      {/* Business Info Overlay */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative -mt-20 flex items-end gap-6">
          {/* Logo */}
          <div className="relative">
            <div className="w-40 h-40 rounded-lg bg-white border-4 border-white shadow-lg overflow-hidden">
              {profile.logo_url ? (
                <SafeImage
                  src={profile.logo_url}
                  alt={`${profile.business_name} logo`}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-4xl font-bold text-gray-400">
                  {profile.business_name[0]}
                </div>
              )}
            </div>
            {profile.business_verified && (
              <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                <Shield className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          
          {/* Business Details */}
          <div className="flex-1 pb-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-3xl font-bold text-gray-900">{profile.business_name}</h1>
              <p className="text-gray-600 mt-1">{formatBusinessType(profile.business_type)}</p>
              
              <div className="flex items-center gap-4 mt-4">
                {profile.website_url && (
                  <a 
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatBusinessType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
```

---

## 4. Business Settings Page

### 4.1 Component Structure (`src/app/settings/business/page.tsx`)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Upload, Save } from 'lucide-react';

export default function BusinessSettings() {
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessType: '',
    logo: null as File | null,
    banner: null as File | null,
    phone: '',
    website: '',
    customerSupportEmail: '',
    about: '',
    address: {
      street: '',
      city: '',
      postcode: '',
      country: 'United Kingdom',
    },
    openingHours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '13:00', closed: false },
      sunday: { open: '', close: '', closed: true },
    },
    customerServiceHours: {
      // Similar structure
    },
  });
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Business Settings</h1>
      
      {/* Branding Section */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold">Branding</h2>
        
        <div>
          <label className="block text-sm font-medium mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center">
              {/* Logo preview */}
            </div>
            <input type="file" accept="image/*" />
            <p className="text-sm text-gray-500">
              Square image, min 200x200px. Max 2MB.
            </p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Banner Image</label>
          <div className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center">
            {/* Banner preview */}
          </div>
          <input type="file" accept="image/*" />
          <p className="text-sm text-gray-500">
            Recommended: 1920x400px. Max 5MB.
          </p>
        </div>
      </section>
      
      {/* Business Information */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold">Business Information</h2>
        {/* Form fields */}
      </section>
      
      {/* Operating Hours */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold">Opening Hours</h2>
        <OpeningHoursEditor 
          hours={businessData.openingHours}
          onChange={(hours) => setBusinessData({...businessData, openingHours: hours})}
        />
      </section>
      
      {/* Business Address (Private) */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Business Address</h2>
          <span className="text-sm text-red-600 font-medium">🔒 Private - Not shown to customers</span>
        </div>
        <p className="text-sm text-gray-600">
          This information is kept private and only used for verification purposes.
        </p>
        {/* Address form fields */}
      </section>
      
      <button className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-lg">
        Save Changes
      </button>
    </div>
  );
}
```

---

## 5. Image Upload System

### 5.1 Supabase Storage Buckets
```sql
-- Create storage buckets for business assets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('business-logos', 'business-logos', true),
  ('business-banners', 'business-banners', true);

-- Storage policies
CREATE POLICY "Anyone can view business logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- Similar for banners
```

### 5.2 Upload API Route (`src/app/api/business/upload-image/route.ts`)
```typescript
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as 'logo' | 'banner';
  const profileId = formData.get('profileId') as string;
  
  // Validate file size and type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }
  
  const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }
  
  // Upload to Supabase storage
  const bucket = type === 'logo' ? 'business-logos' : 'business-banners';
  const fileName = `${profileId}-${Date.now()}.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);
  
  // Update business_info table
  const column = type === 'logo' ? 'logo_url' : 'banner_url';
  await supabase
    .from('business_info')
    .update({ [column]: publicUrl })
    .eq('profile_id', profileId);
  
  return NextResponse.json({ url: publicUrl });
}
```

---

## 6. Promotions & Catalogue Management

### 6.1 Promotions API (`src/app/api/business/promotions/route.ts`)
```typescript
// GET - Fetch active promotions for a business
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  
  const { data, error } = await supabase
    .from('promoted_items')
    .select(`
      *,
      listing:listings(*)
    `)
    .eq('business_profile_id', businessId)
    .eq('active', true)
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order('sort_order', { ascending: true });
  
  return NextResponse.json({ promotions: data });
}

// POST - Create promotion
export async function POST(request: Request) {
  const { listingId, promotionType, discountPercentage, endsAt } = await request.json();
  
  // Verify listing belongs to business
  // Insert promotion
  
  return NextResponse.json({ success: true });
}
```

### 6.2 Promotions Management UI (`src/components/business/PromotionsManager.tsx`)
- Drag-and-drop to reorder promoted items
- Set promotion type (featured, sale, new arrival)
- Add discount percentages
- Set start/end dates
- Limit: e.g., max 6 featured items

---

## 7. Reviews System

### 7.1 Reviews API (`src/app/api/business/reviews/route.ts`)
```typescript
// GET - Fetch reviews for a business
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  
  const { data, error } = await supabase
    .from('business_reviews')
    .select(`
      *,
      reviewer:reviewer_profile_id(username, avatar_url)
    `)
    .eq('business_profile_id', businessId)
    .eq('admin_approved', true)
    .eq('flagged', false)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  return NextResponse.json({ reviews: data });
}

// POST - Create review (requires verified purchase check)
export async function POST(request: Request) {
  const { businessId, rating, title, reviewText, orderId } = await request.json();
  
  // Verify user has purchased from this business
  // Prevent duplicate reviews
  // Insert review
  
  return NextResponse.json({ success: true });
}
```

### 7.2 Reviews Component
- Star rating display
- Filter by rating
- Sort by date/helpfulness
- Business response display
- Verified purchase badge

---

## 8. Privacy & GDPR Compliance

### 8.1 Private Data Handling
```typescript
// Never expose in public API routes:
- business_address (stored in JSONB, only accessible to business owner and admin)
- customer_support_email (optional field, only shown if provided)
- Any PII from other users

// Business Settings page shows:
- ⚠️ Clear indicators for private vs public fields
- 🔒 Lock icons next to private fields
- Explanatory text about data usage
```

### 8.2 Data Access Controls
```sql
-- Create function to get business address (owner only)
CREATE OR REPLACE FUNCTION get_own_business_address(profile_uuid UUID)
RETURNS JSONB AS $$
BEGIN
  IF auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_uuid) THEN
    RETURN (SELECT business_address FROM business_info WHERE profile_id = profile_uuid);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.3 Cookie Consent & Analytics
- Ensure business analytics (views, clicks) comply with GDPR
- Anonymous aggregation only
- No tracking without consent

---

## 9. Migration Path for Existing Users

### 9.1 Upgrade to Business Account
```typescript
// Allow existing individual users to upgrade
// src/app/settings/upgrade-to-business/page.tsx

export default function UpgradeToBusinessPage() {
  // Show benefits of business account
  // Collect additional business information
  // Update account_type in profiles
  // Create business_info record
  // Optionally migrate existing listings
}
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema implementation
- [ ] RLS policies and views
- [ ] Registration flow updates
- [ ] Basic business profile display

### Phase 2: Storefront Core (Week 3-4)
- [ ] Business header component
- [ ] Catalogue display
- [ ] Image upload system
- [ ] Business settings page

### Phase 3: Enhanced Features (Week 5-6)
- [ ] Promotions system
- [ ] New arrivals section
- [ ] Reviews functionality
- [ ] Opening hours display

### Phase 4: Polish & Testing (Week 7-8)
- [ ] Privacy audit
- [ ] GDPR compliance review
- [ ] Performance optimization
- [ ] User testing
- [ ] Documentation

---

## 11. Key Considerations

### Security
- All business data modifications require authentication
- Private fields never exposed in public APIs
- Rate limiting on review submissions
- Image upload validation and scanning

### Performance
- Lazy load catalogue items
- Optimize promoted items queries
- CDN for images (Supabase storage)
- Cache business profile data

### UX
- Clear differentiation between business and individual profiles
- Consistent branding across storefront
- Mobile-responsive design
- Fast page loads

### SEO
- Business name in page title
- Structured data for business info
- Canonical URLs for business profiles
- Meta tags with business description

---

## Next Steps

1. Review and approve this plan
2. Create database migration script
3. Begin Phase 1 implementation
4. Set up staging environment for testing
5. Create business account registration flow
6. Build business storefront components
7. Implement image upload system
8. Add promotions management
9. Build reviews system
10. GDPR audit and compliance check
