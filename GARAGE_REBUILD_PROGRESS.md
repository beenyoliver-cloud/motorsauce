# Garage System Rebuild - Progress Report

## ✅ Completed (Phase 1-2)

### Data Layer
- **Expanded Car Type** (30+ fields) - `src/lib/garage.ts`
  - Basic: make, model, year, trim, color
  - Visual: image, photos[], color
  - Identity: registration, hideRegistration, vin, trim
  - Tracking: mileage, motExpiry, motReminder, insuranceExpiry, insuranceReminder
  - History: lastService, lastServiceMileage, serviceHistory[], notes
  - Marketplace: watchParts, forSale
  - Privacy: hideMileage, hideServiceHistory

- **Privacy Sanitization** - `sanitizeCarForPublic()`
  - Always removes VIN
  - Respects hideRegistration flag
  - Respects hideMileage flag
  - Respects hideServiceHistory flag
  - Removes reminder settings
  - Removes forSale status

### UI Components

#### EnhancedVehicleForm (`src/components/EnhancedVehicleForm.tsx`)
- **Basic Info Section**: Make, model, year, trim, color, mileage
- **Photo Upload**: Single main photo with preview
- **MOT Section**: Date picker + reminder toggle
- **Insurance Section**: Date picker + reminder toggle
- **Advanced Settings** (collapsible):
  - Registration plate input (auto-uppercase)
  - "Hide from public view" checkbox (enables auto-blur)
  - Notes textarea
- **Validation**: Requires make, model, year minimum
- **2MB Image Limit**: Client-side validation

#### DisplayWall (`src/components/DisplayWall.tsx`)
- **Instagram-Style Grid**: 3-6 columns responsive
- **Photo Collection**: Combines car.image + car.photos[] from all vehicles
- **Lightbox**: Full-screen view with keyboard navigation (←/→/ESC)
- **Auto-Blur Integration**: Caches blurred images for performance
- **Photo Info Bar**: Shows counter "X of Y" and car label
- **Actions**: Download and share buttons

#### GarageStats (`src/components/GarageStats.tsx`)
- **4-Card Dashboard**: MOT, Insurance, Mileage, Last Service
- **Color Coding**:
  - 🟢 Green: >14 days until expiry
  - 🟡 Yellow: ≤14 days until expiry
  - 🔴 Red: Expired
- **Reminder Status**: Shows enabled/disabled for MOT and insurance
- **Responsive Layout**: 1 col mobile → 2 col tablet → 4 col desktop

### Utilities

#### Auto-Blur (`src/lib/plateBlur.ts`)
- **UK Plate Patterns**: Current, prefix, suffix, dateless (1963-present)
- **Auto-Detection**: Scans bottom 75-92% of image
- **Box Blur Algorithm**: 3-pass blur with configurable intensity
- **Manual Blur**: `blurImageRegion(x, y, w, h)` for specific areas
- **Privacy Check**: `shouldAutoBlur()` respects hideRegistration flag

#### Reminder Scheduler (`src/lib/reminderScheduler.ts`)
- **Intervals**: 30, 14, 7 days before expiry
- **Time**: 9 AM local time
- **Types**: MOT, insurance, service
- **API Integration**: POST to `/api/garage/reminders`
- **Utilities**:
  - `calculateReminderDates()`: Generate reminder timestamps
  - `scheduleVehicleReminders()`: Schedule all reminders for a vehicle
  - `cancelVehicleReminders()`: Remove all reminders for a vehicle
  - `daysUntil()`: Calculate days to expiry
  - `formatReminderStatus()`: Color-coded status text

### Backend APIs

#### Vehicles API (`src/app/api/garage/vehicles/route.ts`)
- **GET**: Load all user's vehicles (ordered by default, then created_at)
- **POST**: Create new vehicle
- **PUT**: Update vehicle by ID (ownership verification)
- **DELETE**: Remove vehicle by ID (ownership verification)
- **Auth**: Expects `x-user-id` header (ready for full auth integration)
- **Status**: ⚠️ Code ready but will fail until SQL migration applied

#### Reminders API (`src/app/api/garage/reminders/route.ts`)
- **GET**: List all reminders for user
- **POST**: Create reminder (validates userId, vehicleId, type, scheduledFor)
- **DELETE**: Cancel reminders by ID or vehicleId
- **Storage**: Currently in-memory (temporary)
- **Status**: ⚠️ Stub implementation - needs full DB integration

### Database Schema

#### SQL Migration (`sql/create_garage_vehicles.sql`)
```sql
-- garage_vehicles table (28 columns)
- id (uuid, primary key)
- user_id (uuid, references profiles)
- make, model, year, trim, color
- registration, hide_registration, vin
- mileage, mot_expiry, mot_reminder
- insurance_expiry, insurance_reminder
- last_service, last_service_mileage, notes
- service_history (jsonb)
- watch_parts, for_sale
- hide_mileage, hide_service_history
- image, photos (text[])
- is_public, is_default
- created_at, updated_at

-- garage_reminders table
- id, user_id, vehicle_id
- type (mot|insurance|service)
- scheduled_for, sent
- created_at

-- Indexes
- idx_garage_user (user_id)
- idx_garage_make_model_year
- idx_reminders_user (user_id)
- idx_reminders_due (scheduled_for WHERE NOT sent)
```

**Status**: ⚠️ **NOT YET APPLIED** - Waiting for manual execution

### Integration
- **MyGarageCard** updated to use EnhancedVehicleForm
- **DisplayWall** and **GarageStats** integrated into profile pages
- **Reminder Scheduling** wired to vehicle creation

---

## 🔄 Next Steps (Immediate)

### 1. Apply Database Migration
**CRITICAL - Must be done manually:**

```bash
# Open Supabase SQL Editor
https://supabase.com/dashboard/project/ufmkjjmoticwdhxtgyfo/sql/new

# Copy and paste contents of:
sql/create_garage_vehicles.sql

# Execute and verify tables created
```

**Alternative**: Use provided scripts (may need env var adjustments):
```bash
# Option 1: Bash script
./scripts/apply-garage-migration.sh

# Option 2: Node script  
node scripts/run-garage-migration.mjs
```

### 2. Add Edit Vehicle Form
Currently missing - need to:
- Add edit mode to EnhancedVehicleForm (pass `initialData` prop)
- Wire up edit button in MyGarageCard
- Update existing vehicle in localStorage + reschedule reminders

### 3. Implement Full Reminder System
Current status: Stub implementation
- Switch reminders API from in-memory to Supabase
- Add RLS policies for garage_reminders table
- Create email notification system (SendGrid/Resend)
- Create reminder email templates (MOT, insurance, service)
- Add cron job/webhook to check for due reminders
- Send emails at scheduled times

### 4. Add Multiple Photo Upload
Current: Single main photo only
- Expand EnhancedVehicleForm to accept multiple photos
- Add photo gallery management (reorder, delete)
- Update photos[] array in Car type
- Wire to DisplayWall component

---

## 📋 Remaining Features (Phases 3-7)

### Phase 3: Parts Integration
- [ ] Compatible parts counter (query listings by vehicle specs)
- [ ] "Search for parts" button (pre-fills search with make/model/year)
- [ ] Watch alerts (notifications when compatible parts listed)
- [ ] Watchlist management UI

### Phase 4: Social & Sharing
- [ ] QR code generation (links to public garage)
- [ ] Social share cards (Open Graph meta tags)
- [ ] Share button with copy link
- [ ] Embed code for external websites
- [ ] Gallery export (download all photos as zip)

### Phase 5: Advanced Features
- [ ] Vehicle value estimates (integration with valuation API)
- [ ] Running costs calculator (fuel, tax, insurance, maintenance)
- [ ] Service history timeline
- [ ] Maintenance schedule/planner
- [ ] Achievement badges (e.g., "10 Year Keeper", "Collector")
- [ ] Garage analytics (total value, average age, etc.)

### Phase 6: Mobile Optimizations
- [ ] Swipe gestures for photo navigation
- [ ] Pull-to-refresh for garage data
- [ ] Native-like animations (card flips, slide-ins)
- [ ] Mobile camera access for quick photo uploads
- [ ] Progressive image loading
- [ ] Offline mode (service worker cache)

### Phase 7: Polish & Performance
- [ ] Image optimization (WebP conversion, lazy loading)
- [ ] Loading skeletons for all components
- [ ] Error boundaries and graceful failures
- [ ] Accessibility audit (ARIA labels, keyboard nav)
- [ ] Analytics tracking (vehicle adds, photo uploads, shares)
- [ ] User onboarding flow
- [ ] Animated micro-interactions

---

## 🚀 How to Test Current Features

### 1. Add a Vehicle with Full Details
1. Go to your profile page
2. Click "Add Vehicle"
3. Fill in:
   - Make, model, year (required)
   - Trim, color, mileage (optional)
   - Upload photo
   - MOT expiry date + enable reminder
   - Insurance expiry date + enable reminder
   - Advanced: Registration plate + "Hide from public view"
   - Notes
4. Click "Add Vehicle"
5. Check browser console for reminder scheduling API calls

### 2. View Garage Stats
- Stats cards appear below your default vehicle
- Color coding indicates urgency (green/yellow/red)
- Hover to see reminder status

### 3. View Display Wall
- Instagram-style grid shows all photos from all vehicles
- Click any photo for full-screen lightbox
- Use ← → arrow keys or on-screen arrows to navigate
- Press ESC to close lightbox
- Try download/share buttons

### 4. Test Auto-Blur (once DB migration applied)
1. Add vehicle with registration plate
2. Enable "Hide from public view"
3. Upload photo with visible number plate
4. Auto-blur should detect and blur plate automatically
5. View in DisplayWall to verify blurred version

### 5. Test Privacy Controls
1. Add vehicle with sensitive data (VIN, mileage, service history)
2. Enable hide flags
3. View public garage (sign out or use different browser)
4. Verify sensitive data is hidden

---

## 📊 Build Status

**Latest Build**: ✅ Passing
- Profile page: 23.9kB → 24.7kB (+800 bytes for new components)
- New routes: `/api/garage/reminders`, `/api/garage/vehicles`
- TypeScript: All types valid
- No lint errors

**Git Commits**:
1. `e223974` - Garage: integrate DisplayWall and GarageStats
2. `8e02e32` - Garage: add enhanced vehicle form with MOT, insurance, mileage, registration
3. `df12fa1` - Garage: add reminder scheduling for MOT and insurance dates

---

## ⚠️ Known Limitations

1. **Database Not Connected**: All vehicle data currently in localStorage
   - Reminder scheduling API calls will fail until migration applied
   - Data only visible on same browser/device

2. **No Email Notifications**: Reminders scheduled but not sent
   - Need SMTP/SendGrid configuration
   - Need cron job to check for due reminders

3. **Single Photo Only**: Multiple photos not yet implemented
   - photos[] array exists but form doesn't populate it

4. **No Edit Form**: Can only add new vehicles, not edit existing
   - Need to wire up edit mode in EnhancedVehicleForm

5. **In-Memory Reminders**: Reminders API uses memory array (resets on restart)
   - Temporary until DB migration applied

6. **No RLS Policies**: SQL migration doesn't include Row Level Security
   - Need to add policies for garage_vehicles and garage_reminders

---

## 🎯 Success Metrics

**When Phase 1-2 is complete**, users can:
- ✅ Add vehicles with 30+ fields including MOT/insurance dates
- ✅ View color-coded status dashboard for vehicle tracking
- ✅ Browse Instagram-style photo wall with lightbox
- ✅ Protect privacy with auto-blur and granular hide flags
- ⏳ Receive reminder notifications (pending email system)
- ⏳ Store data persistently (pending DB migration)

**Next milestone**: Parts integration connecting garage to marketplace

---

## 📝 Notes

- DVLA API key application submitted 1 Dec 2025 (pending approval)
- Supabase connection: `https://ufmkjjmoticwdhxtgyfo.supabase.co`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`
- All UI components responsive (mobile/tablet/desktop)
- Auto-blur supports UK plate patterns (current/prefix/suffix/dateless)
