# 🔧 Quick Start: Apply Garage Database Migration

## Option 1: Supabase Dashboard (Recommended)

1. **Open SQL Editor**:
   ```
   https://supabase.com/dashboard/project/ufmkjjmoticwdhxtgyfo/sql/new
   ```

2. **Copy SQL**:
   - Open file: `sql/create_garage_vehicles.sql`
   - Copy entire contents

3. **Paste and Run**:
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for "Success" message

4. **Verify**:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('garage_vehicles', 'garage_reminders');
   
   -- Should return 2 rows
   ```

---

## Option 2: Command Line (If psql configured)

```bash
# From project root
psql $DATABASE_URL -f sql/create_garage_vehicles.sql
```

---

## Option 3: Automated Script (Experimental)

```bash
# Node script (uses @supabase/supabase-js)
node scripts/run-garage-migration.mjs

# If that hangs, try bash script
./scripts/apply-garage-migration.sh
```

**Note**: Scripts may have dependency/env var issues. Manual dashboard method is most reliable.

---

## What This Creates

### Tables

**garage_vehicles** (28 columns):
- Basic: id, user_id, make, model, year, trim, color
- Visual: image, photos[]
- Identity: registration, hide_registration, vin
- Tracking: mileage, mot_expiry, mot_reminder, insurance_expiry, insurance_reminder
- History: last_service, last_service_mileage, notes, service_history
- Marketplace: watch_parts, for_sale
- Privacy: hide_mileage, hide_service_history
- Meta: is_public, is_default, created_at, updated_at

**garage_reminders**:
- id, user_id, vehicle_id
- type (mot|insurance|service)
- scheduled_for, sent
- created_at

### Indexes
- `idx_garage_user` - Fast lookup by user
- `idx_garage_make_model_year` - Fast filtering by vehicle specs
- `idx_reminders_user` - Fast lookup of user's reminders
- `idx_reminders_due` - Fast query for unsent due reminders

---

## After Migration

### Test the API Endpoints

```bash
# List vehicles (will be empty at first)
curl -X GET http://localhost:3000/api/garage/vehicles \
  -H "x-user-id: your-username"

# Add a vehicle
curl -X POST http://localhost:3000/api/garage/vehicles \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-username" \
  -d '{
    "make": "Porsche",
    "model": "944",
    "year": "1989",
    "color": "Guards Red",
    "mileage": 85000,
    "motExpiry": "2025-06-15",
    "motReminder": true
  }'

# Schedule reminders
curl -X POST http://localhost:3000/api/garage/reminders \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-username" \
  -d '{
    "vehicleId": "vehicle-id-from-above",
    "type": "mot",
    "scheduledFor": "2025-05-15T09:00:00Z"
  }'
```

### Update localStorage to Database

Current vehicles are in localStorage only. After migration:

1. Visit your profile page
2. Open browser console
3. Run:
   ```javascript
   // Export current vehicles
   const cars = JSON.parse(localStorage.getItem('ms_garage_cars_v2') || '[]');
   console.log(JSON.stringify(cars, null, 2));
   ```
4. Copy JSON output
5. For each vehicle, POST to `/api/garage/vehicles` (see example above)
6. Refresh page to see vehicles loaded from database

---

## Troubleshooting

### "relation already exists"
Tables already created. You're good to go!

### "permission denied"
Check that your Supabase service role key is correct in `.env.local`:
```
SUPABASE_SERVICE_ROLE=your_actual_key_here
```

### "syntax error near..."
Make sure you copied the entire SQL file including all semicolons.

### API returns 500 errors
1. Check Supabase logs in dashboard
2. Verify tables exist (see Verify step above)
3. Check `user_id` matches your profile `id` in `profiles` table

### Reminders not scheduling
1. Check browser console for API errors
2. Verify reminder dates are in the future
3. Check reminders table: 
   ```sql
   SELECT * FROM garage_reminders WHERE user_id = 'your-user-id';
   ```

---

## Next Steps After Migration

1. ✅ Test adding vehicle with full form
2. ✅ Verify stats display correctly
3. ✅ Check display wall shows photos
4. ✅ Test privacy controls (hide registration, auto-blur)
5. ⏳ Set up email notifications (see GARAGE_REBUILD_PROGRESS.md)
6. ⏳ Add edit vehicle form
7. ⏳ Implement multiple photo uploads

---

## Rollback (If Needed)

If something goes wrong, you can drop the tables:

```sql
DROP TABLE IF EXISTS garage_reminders CASCADE;
DROP TABLE IF EXISTS garage_vehicles CASCADE;
```

Then start over with the migration script.

---

## Environment Variables Required

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ufmkjjmoticwdhxtgyfo.supabase.co
SUPABASE_SERVICE_ROLE=your_service_role_key_here
```

**Note**: Variable name is `SUPABASE_SERVICE_ROLE` (no `_KEY` suffix)

---

## Help

If stuck:
1. Check Supabase logs: Dashboard → Logs → Postgres
2. Check API logs: `npm run dev` and watch console
3. Verify env vars: `grep SUPABASE .env.local`
4. Test connection: Visit `/api/health` in browser
