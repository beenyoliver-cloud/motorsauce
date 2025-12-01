# Garage System - Comprehensive Redesign

> **Status**: Implementation in progress  
> **Started**: 1 Dec 2025  
> **Features**: 40+ new features across 7 major categories

## Overview

Complete overhaul of the garage system with Instagram-style display wall, auto-blurring number plates, MOT/insurance reminders, service history tracking, and extensive privacy controls.

---

## ✅ Phase 1: Data Structure (COMPLETED)

### Updated `Car` Type in `src/lib/garage.ts`

**New Fields Added:**

**Visual:**
- `photos?: string[]` - Additional photos beyond main image
- `color?: string` - Actual vehicle color for display

**Registration & Identity:**
- `registration?: string` - Vehicle registration plate (SENSITIVE)
- `hideRegistration?: boolean` - Privacy flag
- `vin?: string` - Vehicle VIN (never shown publicly)
- `trim?: string` - Trim level/variant

**Tracking & Reminders:**
- `mileage?: number` - Current mileage
- `motExpiry?: string` - MOT expiry date (ISO)
- `motReminder?: boolean` - Enable MOT reminders
- `insuranceExpiry?: string` - Insurance expiry (ISO)
- `insuranceReminder?: boolean` - Enable insurance reminders
- `lastService?: string` - Last service date
- `lastServiceMileage?: number` - Mileage at last service

**Notes & History:**
- `notes?: string` - Personal notes
- `serviceHistory?: Array<{date, mileage, description, cost}>` - Full service log

**Marketplace Integration:**
- `watchParts?: boolean` - Watch for compatible parts
- `forSale?: boolean` - Mark vehicle for sale

**Privacy Controls:**
- `hideMileage?: boolean` - Hide from public
- `hideServiceHistory?: boolean` - Hide from public

### Privacy Protection

**`sanitizeCarForPublic()` function:**
- Always removes: VIN, reminder settings, forSale status
- Conditionally removes based on flags: registration, mileage, service history
- Automatically applied when publishing garage publicly

---

## ✅ Phase 2: Number Plate Auto-Blur (COMPLETED)

### Created `src/lib/plateBlur.ts`

**Pattern Detection:**
- Current format (2001+): AB12 CDE
- Prefix format (1983-2001): A123 BCD
- Suffix format (1963-1983): ABC 123D
- Dateless format (pre-1963): ABC 123

**Functions:**
- `containsPlate(text)` - Check if text has plate pattern
- `extractPlates(text)` - Extract all plates from text
- `autoBlurPlates(imageUrl)` - Auto-detect and blur plates in image
- `blurImageRegion(imageUrl, x, y, w, h)` - Manual blur specific area
- `shouldAutoBlur(car)` - Check if car needs auto-blur

**Algorithm:**
- Canvas-based box blur (3-pass for smoothness)
- Heuristic detection: checks common plate positions (bottom 75-92% of image)
- Configurable blur intensity

---

## ✅ Phase 3: Display Wall Component (COMPLETED)

### Created `src/components/DisplayWall.tsx`

**Features:**
- Instagram-style photo grid (3-6 columns responsive)
- Lightbox with keyboard navigation (←/→/ESC)
- Auto-blur integration for privacy
- Download and share buttons
- Photo counter and labels
- Smooth transitions and hover effects

**Props:**
- `cars: Car[]` - Array of garage vehicles
- `onPhotoClick?` - Callback when photo clicked
- `autoBlur?: boolean` - Enable/disable auto-blur (default: true)

---

## 🔄 Phase 4: Visual Redesign (IN PROGRESS)

### Modern Card Design

**Stats Cards:**
```typescript
<StatCard 
  icon={AlertCircle}
  label="MOT Due"
  value="23 days"
  status="warning"  // success | warning | danger
/>
```

**Features:**
- MOT status indicator (green/yellow/red)
- Insurance status indicator
- Mileage display with trend
- Service due indicator
- Days until expiry calculations

### Mobile Optimizations

**Swipe Gestures:**
- Swipe between cars (horizontal)
- Swipe to delete (with confirmation)
- Pull-to-refresh garage data

**Compact View:**
- Toggle between expanded and list view
- Card/list hybrid for mobile
- Sticky headers when scrolling

### Animations

**Micro-interactions:**
- Card flip on favorite/default change
- Slide-in new vehicle additions
- Fade transitions between states
- Skeleton loaders during data fetch

---

## 🔜 Phase 5: Parts Integration

### Compatible Parts Counter

```typescript
async function getCompatiblePartsCount(car: Car): Promise<number> {
  const params = new URLSearchParams({
    make: car.make,
    model: car.model,
    year: car.year,
  });
  const res = await fetch(`/api/listings?${params}`);
  const data = await res.json();
  return data.length;
}
```

**Display:**
- Badge on each car card: "124 parts available"
- Click to search for compatible parts
- Real-time updates when new parts listed

### Watch Alerts

**Feature:**
- Toggle "Watch for Parts" on each vehicle
- Email/push notification when compatible part listed
- Notification preferences in settings

**Implementation:**
- Store watch status in `car.watchParts`
- Background job checks new listings
- Match against watched vehicle specs

### Similar Owners

**Feature:**
- "3 other users have this car"
- Click to see their public profiles
- Optional: "Connect with [Username]" button

**Query:**
```sql
SELECT DISTINCT user_id, username 
FROM garage_vehicles 
WHERE make = ? AND model = ? AND year = ?
AND is_public = true
LIMIT 5
```

---

## 🔜 Phase 6: Reminder System

### Database Schema

```sql
-- New table for garage data (persistent across devices)
CREATE TABLE garage_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT NOT NULL,
  registration TEXT,
  hide_registration BOOLEAN DEFAULT false,
  mileage INTEGER,
  mot_expiry DATE,
  mot_reminder BOOLEAN DEFAULT false,
  insurance_expiry DATE,
  insurance_reminder BOOLEAN DEFAULT false,
  last_service DATE,
  notes TEXT,
  photos JSONB DEFAULT '[]',
  service_history JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification queue
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES garage_vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'mot_reminder' | 'insurance_reminder' | 'service_due' | 'part_alert'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_scheduled ON notification_queue(scheduled_for) WHERE NOT sent;
```

### API Endpoints

**`POST /api/garage/reminders`**
- Schedule MOT/insurance reminders
- Parameters: vehicle_id, type, days_before

**`GET /api/garage/reminders`**
- Get upcoming reminders for user

**`DELETE /api/garage/reminders/:id`**
- Cancel a reminder

### Email Templates

**MOT Reminder:**
```
Subject: MOT Due Soon - [Car Make Model]

Hi [Name],

Your [Year Make Model] is due for its MOT in [X] days on [Date].

[Find local MOT centers]
[View vehicle details]
```

**Insurance Reminder:**
```
Subject: Insurance Renewal - [Car Make Model]

Your insurance for [Year Make Model] expires in [X] days.

[Compare quotes]
[View vehicle details]
```

### Notification Timing

- **30 days before** - First reminder
- **14 days before** - Second reminder
- **7 days before** - Final reminder
- **Day of** - "Due today" alert

---

## 🔜 Phase 7: QR Codes & Sharing

### QR Code Generation

```typescript
import QRCode from 'qrcode';

async function generateGarageQR(username: string): Promise<string> {
  const url = `${window.location.origin}/profile/${username}#garage`;
  return await QRCode.toDataURL(url);
}
```

**Display:**
- Button: "Show QR Code"
- Modal with large QR code
- "Save Image" and "Print" options
- Use case: Car meets, business cards

### Social Share Cards

**Open Graph meta tags:**
```html
<meta property="og:title" content="[Name]'s Garage - MotorSauce" />
<meta property="og:description" content="Check out my [X] vehicles" />
<meta property="og:image" content="[Generated collage of car photos]" />
```

**Share Buttons:**
- Twitter/X
- Facebook
- WhatsApp
- Copy link

### Selective Privacy

**Granular controls:**
- ✅ Show garage publicly (master toggle)
- ✅ Hide registration plates
- ✅ Hide mileage
- ✅ Hide service history
- ✅ Hide specific vehicles (per-car toggle)
- ✅ Hide VIN (always hidden)

---

## 🔜 Phase 8: Advanced Features

### Value Estimates

**Integration with valuation APIs:**
- Cazana API
- CAP HPI
- Parkers

**Display:**
- "Estimated value: £8,500 - £9,200"
- Trend indicator (↑ ↓ →)
- Last updated date

### Running Costs Tracker

**Track:**
- Fuel purchases
- Parts bought from marketplace
- Service costs
- Insurance premiums
- Road tax

**Display:**
- Monthly breakdown chart
- Cost per mile
- Year-to-date totals

### Achievements/Badges

**Examples:**
- 🏆 Classic Owner (vehicle 25+ years old)
- 🚗 Multi-Car Enthusiast (3+ vehicles)
- 🔧 DIY Mechanic (10+ service entries)
- 📸 Photographer (15+ photos)
- ⭐ Trusted Seller (5+ sales)

---

## Implementation Priority

### Must-Have (Phase 1-4): ✅ DONE
1. ✅ Data structure with privacy
2. ✅ Auto-blur functionality
3. ✅ Display wall component
4. 🔄 Visual redesign

### Should-Have (Phase 5-6):
5. Parts integration
6. Reminder system with database

### Nice-to-Have (Phase 7-8):
7. QR codes and sharing
8. Advanced features (value, costs, badges)

---

## Migration Strategy

### Existing Users

**Backwards compatible:**
- Old `Car` objects still work (only has: id, make, model, year, image)
- New fields are optional
- `loadMyCars()` handles missing fields gracefully

**Gradual adoption:**
- Banner: "New garage features available! Add MOT date for reminders"
- Optional onboarding wizard
- Feature discovery tooltips

### Data Migration

**localStorage → Database:**
```typescript
async function migrateToDatabase() {
  const localCars = loadMyCars();
  await Promise.all(
    localCars.map(car => 
      fetch('/api/garage/vehicles', {
        method: 'POST',
        body: JSON.stringify(car),
      })
    )
  );
  // Keep localStorage as cache
}
```

---

## Testing Checklist

### Privacy & Security
- [ ] VIN never exposed in public view
- [ ] Registration hidden when `hideRegistration = true`
- [ ] Mileage hidden when `hideMileage = true`
- [ ] Service history hidden when `hideServiceHistory = true`
- [ ] Reminder settings never public
- [ ] Auto-blur works correctly
- [ ] Manual blur works correctly

### Functionality
- [ ] Add vehicle with all new fields
- [ ] Edit vehicle (preserve all fields)
- [ ] Delete vehicle
- [ ] Set default vehicle
- [ ] Toggle public/private
- [ ] Upload multiple photos
- [ ] Display wall shows all photos
- [ ] Lightbox navigation works
- [ ] Download photos works
- [ ] Share functionality works

### Reminders
- [ ] MOT reminder scheduled correctly
- [ ] Insurance reminder scheduled correctly
- [ ] Email sent at correct time
- [ ] Can cancel reminder
- [ ] Multiple vehicles handled correctly

### Mobile
- [ ] Responsive grid (3/4/5/6 cols)
- [ ] Swipe gestures work
- [ ] Touch interactions smooth
- [ ] Images load efficiently
- [ ] Lightbox works on mobile

### Performance
- [ ] Images lazy loaded
- [ ] Auto-blur doesn't block UI
- [ ] Large galleries perform well
- [ ] Local storage size reasonable
- [ ] Database queries optimized

---

## Next Steps

1. **Finish visual redesign** - Stats cards, animations, mobile optimization
2. **Build parts integration** - Counter, search button, watch alerts
3. **Implement reminder system** - Database, API, email templates
4. **Add QR codes** - Generation, display, printing
5. **Launch advanced features** - Value estimates, cost tracking, badges

**Estimated completion**: 2-3 weeks full implementation
**MVP (Phases 1-4)**: Ready for testing in 3-5 days
