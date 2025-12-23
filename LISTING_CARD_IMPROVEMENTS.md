# Listing Card Improvements

## Current State
Listing cards currently show:
- Title
- Price
- Image  
- Basic badges (NEW, Available, Price Drop)
- Favorite button

## Missing Information
1. **Vehicle Compatibility** - Make/Model/Year
2. **Condition** - Used/New condition status
3. **Seller Info** - Name and rating
4. **Location** - Seller county for distance reference
5. **Category** - OEM/Aftermarket/Tool
6. **OEM Number** - For easy identification

## Proposed Enhancements

### Compact Card (Home/Search Grid)
- Add condition badge
- Show vehicle compatibility under title
- Add seller name + rating
- Show location (county)
- Display category

### Detailed Card (Search Results - Optional)
- Everything from compact
- OEM number if available
- Distance from user
- Description preview (1-2 lines)

## Implementation
Creating EnhancedListingCard component that can be used across:
- Home page featured rows
- Search results grid
- Recently viewed
- Category pages
