# Draft Listings & Account Settings Implementation Complete

## Summary

We've successfully implemented:

1. **Drafts Tab on Profile** - Users can now see their draft listings with reasons
2. **Account Settings with Location** - Users can set postcode, county, and country
3. **Location Display on Profile** - County and Country shown publicly on profile

---

## Changes Made

### 1. Draft Listings Tab Integration

#### SavedTabGate.tsx
- Added `"drafts"` to `activeTab` type union
- Added draft count state and `loadDraftCount()` function  
- Added "Drafts" tab link (only visible to owner) with draft count badge
- Tab appears between "My Listings" and "About"

#### MyDraftsTab.tsx (Already Created)
- Component displays draft listings with yellow styling
- Shows draft reason to help user understand why it's a draft
- Edit button on each draft to fix and republish
- "DRAFT" badge with AlertCircle icon

#### Profile Page (profile/[username]/page.tsx)
- Added `"drafts"` to `activeTab` type  
- Imported `MyDraftsTab` component
- Added rendering logic: `{activeTab === "drafts" && <MyDraftsTab sellerName={displayName} />}`

### 2. Account Settings with Location

#### Settings Page (src/app/settings/page.tsx)
- Added state variables: `postcode`, `county`, `country`
- Load location data from profiles table on page load
- Save location data when updating profile
- Added location section to form with:
  - **Postcode** input (uppercase, used for distance calculations, not shown publicly)
  - **County** input (shown publicly)
  - **Country** input (shown publicly, defaults to "United Kingdom")
- Clear helper text explaining privacy and usage

#### Seller Profile API (api/seller-profile/route.ts)
- Added `county` and `country` to SELECT query
- Returns location data with profile metrics

#### Profile Display (profile/[username]/page.tsx)
- Added `county` and `country` to `sellerMetrics` type
- Display location in info bubbles as "County, Country" format
- Falls back gracefully if only county or country is set
- Location badge only shows if data exists

### 3. Database Migration

#### sql/add_user_location_fields.sql
Created new migration to add location columns to profiles table:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;
```

Includes:
- Index on `(county, country)` for faster queries
- Column comments explaining purpose and privacy

---

## Features Summary

### Drafts Tab
✅ Only visible to profile owner  
✅ Shows count badge (e.g., "Drafts (3)")  
✅ Yellow styling to distinguish from active listings  
✅ Displays draft reason (e.g., "Some images may be broken")  
✅ Edit button on each draft  
✅ Empty state when no drafts  

### Account Settings - Location
✅ Optional fields (not required)  
✅ Postcode for distance calculations (private)  
✅ County and Country displayed publicly  
✅ Clear privacy messaging  
✅ Saved with other profile updates  
✅ Form validation and error handling  

### Profile Display
✅ Location badge shows "County, Country"  
✅ Falls back to single value if only one is set  
✅ Hidden if no location data  
✅ Consistent styling with other info badges  

---

## Required Database Migrations

Run these SQL files in Supabase SQL Editor (in order):

1. **sql/add_public_garages.sql** - Public garage visibility
2. **sql/add_listing_management_features.sql** - Listing edit/draft/sold/delete system  
3. **sql/add_user_location_fields.sql** - User location fields (NEW)

---

## Testing Checklist

### Drafts Tab
- [ ] Navigate to your profile
- [ ] Verify "Drafts" tab appears (only when logged in to your own profile)
- [ ] Verify count badge updates when drafts change
- [ ] Click Drafts tab, verify yellow-styled listings appear
- [ ] Verify draft reason displays correctly
- [ ] Click Edit button, verify navigation to edit page
- [ ] Verify tab not visible on other users' profiles

### Account Settings
- [ ] Navigate to /settings
- [ ] Enter postcode (e.g., "SW1A 1AA")
- [ ] Enter county (e.g., "Greater London")
- [ ] Enter country (e.g., "United Kingdom")
- [ ] Click "Save Changes"
- [ ] Verify success message
- [ ] Navigate to your profile
- [ ] Verify location badge shows "County, Country"
- [ ] Try with only county or only country, verify fallback works

### Location Privacy
- [ ] Verify postcode is NOT displayed publicly on profile
- [ ] Verify only county and country are shown
- [ ] Verify location badge hidden if no data set

---

## User Flow Examples

### Creating a Draft
1. User creates listing with broken images
2. System auto-saves as draft with reason "Some images may be broken"
3. User sees draft count badge on profile
4. User clicks Drafts tab
5. User sees yellow-styled draft with reason
6. User clicks Edit, fixes images
7. User saves → listing becomes active

### Setting Location
1. User navigates to Settings
2. Scrolls to "Location (Optional)" section
3. Enters postcode for distance calculations
4. Enters county and country for public display
5. Saves changes
6. Profile now shows "County, Country" badge
7. Listing pages can calculate distance from buyer to seller

---

## Database Schema Changes

### profiles table (NEW COLUMNS)
- `postcode` TEXT - User's postcode (private, for distance calculation)
- `county` TEXT - User's county (public display)
- `country` TEXT - User's country (public display)

### Indexes
- `idx_profiles_county_country` - Faster location queries

---

## Files Modified

1. ✅ `src/components/SavedTabGate.tsx` - Added Drafts tab and count
2. ✅ `src/components/MyDraftsTab.tsx` - Already created in previous step
3. ✅ `src/app/profile/[username]/page.tsx` - Added drafts rendering and location type
4. ✅ `src/app/settings/page.tsx` - Added location fields to form
5. ✅ `src/app/api/seller-profile/route.ts` - Added county/country to query
6. ✅ `sql/add_user_location_fields.sql` - NEW migration file

---

## Next Steps

1. **Run SQL Migrations** (in Supabase SQL Editor)
2. **Test Drafts Tab** - Create a draft listing, verify it shows in Drafts tab
3. **Test Location Settings** - Add location, verify it displays on profile
4. **Deploy to Vercel** - Push changes and deploy

---

## Notes

- Location is **optional** - users can leave fields blank
- Postcode is **never displayed publicly** - only used for distance calculations
- County and Country are **public** - shown on profile badge
- Drafts tab is **owner-only** - never visible to other users
- Draft count updates **dynamically** when drafts change
- Yellow styling clearly distinguishes drafts from active listings

---

## Previous Fix Recap

In this session we also fixed:
- ✅ Edit button functionality (moved outside Link wrapper, positioned absolutely)
- ✅ MyListingsTab edit button now works correctly
- ✅ Created MyDraftsTab component with yellow styling

All features are now implemented and ready for testing! 🎉
