# Vehicle Registration Lookup Setup

## Overview

The registration lookup feature allows users to search for compatible parts by entering their UK number plate. The system looks up vehicle details (make, model, year, generation, engine) and filters listings accordingly.

## Current Status

✅ **API Endpoint Created**: `/api/registration/route.ts`  
✅ **Frontend Integration**: `/app/registration/page.tsx` already configured  
⚠️ **Using Mock Data**: Currently returns test data for development

## How It Works

1. User enters UK registration (e.g., "AB12 CDE")
2. Frontend calls `/api/registration?reg=AB12CDE`
3. API normalizes registration and looks up vehicle details
4. Returns: `{ make, model, year, gen?, engine? }`
5. Frontend filters listings to show compatible parts

## Testing with Mock Data

The API currently includes test registrations:

```
AB12CDE → BMW 3 Series (2015, F30, 2.0 Diesel)
XY34FGH → Audi A4 (2018, B9, 2.0 TFSI)  
LM56NOP → Volkswagen Golf (2020, Mk8, 1.5 TSI)
```

**To test:**
1. Go to `/registration`
2. Enter one of the above registrations
3. Click "Find Compatible Parts"
4. Should see vehicle details and filtered listings

## Production Setup Options

### Option 1: DVLA API (Official, Free Tier Available)

**Pros:**
- Official UK government data
- Most accurate and up-to-date
- Free tier: 10 requests/second

**Setup:**
1. Register at: https://developer-portal.driver-vehicle-licensing.api.gov.uk/
2. Create an application and get API key
3. Add to `.env.local`:
   ```
   DVLA_API_KEY=your_api_key_here
   ```
4. Uncomment the `lookupDVLA()` function in `/api/registration/route.ts`
5. Update the GET handler to use DVLA:
   ```typescript
   const vehicleData = await lookupDVLA(normalizedReg);
   ```

**DVLA API Response Format:**
```json
{
  "registrationNumber": "AB12CDE",
  "make": "BMW",
  "model": "3 SERIES",
  "yearOfManufacture": 2015,
  "engineCapacity": 1995,
  "fuelType": "DIESEL",
  "colour": "BLUE"
}
```

### Option 2: Third-Party Services

**Options:**
- **CarCheck** (UK) - https://www.carcheck.co.uk/api
- **HPI Check** - https://www.hpicheck.com/api
- **AutoCheck** - Vehicle history + registration lookup
- **Cazana** - https://www.cazana.com/api

**Pros:**
- Often include additional data (MOT history, valuations)
- May have better model/generation detection
- Commercial support available

**Cons:**
- Paid services (typically £0.05-0.20 per lookup)
- Require API contracts

**Setup Example:**
1. Sign up with provider and get API key
2. Add to `.env.local`:
   ```
   VEHICLE_API_KEY=your_key
   VEHICLE_API_URL=https://api.provider.com/lookup
   ```
3. Uncomment `lookupThirdParty()` function
4. Adjust mapping to match provider's response format

### Option 3: Keep Mock Data (Development Only)

For development/demo purposes, you can expand the mock database:

```typescript
const MOCK_VEHICLES: Record<string, VehicleData> = {
  "AB12CDE": { make: "BMW", model: "3 Series", year: 2015 },
  // Add more test registrations...
};
```

## Implementation Recommendations

### For Production Launch:

**Start with DVLA API:**
- ✅ Free tier sufficient for initial traffic
- ✅ Most reliable and accurate
- ✅ No ongoing costs until scale

**When to upgrade:**
- If you need MOT history, valuations, or theft checks
- When you exceed DVLA rate limits (10/sec is ~860k/day)
- If you want better generation/engine detection

### Caching Strategy

The frontend already implements localStorage caching (`motorsauce:regmap`), which saves API calls:

```typescript
// Cached in browser, no API call needed on repeat lookups
localStorage.setItem("motorsauce:regmap", JSON.stringify({
  "AB12CDE": { make: "BMW", model: "3 Series", year: 2015 }
}));
```

**Consider adding:**
- Server-side Redis cache (24hr TTL)
- Database table for frequently looked-up registrations
- Rate limiting to prevent abuse

## Error Handling

Current implementation handles:
- ✅ Missing/invalid registration format
- ✅ Vehicle not found (404)
- ✅ API errors (500)
- ✅ Falls back to manual vehicle selection

Frontend gracefully degrades:
```typescript
if (vehicleNotFound) {
  // Show manual make/model/year picker
  setShowManual(true);
}
```

## Analytics & Monitoring

**Track these metrics:**
- Registration lookup success rate
- Popular makes/models searched
- Cache hit rate
- API response times
- Fallback to manual selection rate

**Add to registration endpoint:**
```typescript
// Track successful lookups
await supabase.from('analytics_events').insert({
  event_type: 'registration_lookup',
  event_data: { reg: normalizedReg, found: !!vehicleData }
});
```

## Cost Estimates

**DVLA API (Free Tier):**
- Up to 10 requests/second = FREE
- Good for first ~50k monthly users

**Third-Party (Paid):**
- £0.05-0.20 per lookup
- 10k lookups/month = £500-2000/month
- With 50% cache hit rate = £250-1000/month

## Next Steps

1. **For Development/Testing:**
   - ✅ Already working with mock data
   - Add more test registrations to `MOCK_VEHICLES`

2. **For Production (Recommended):**
   - Register for DVLA API key
   - Add `DVLA_API_KEY` to `.env.local`
   - Uncomment `lookupDVLA()` function
   - Test with real registrations
   - Deploy and monitor

3. **Future Enhancements:**
   - Add Redis caching layer
   - Implement rate limiting
   - Add analytics tracking
   - Consider hybrid approach (DVLA + fallback provider)

## Support

**DVLA API Issues:**
- Portal: https://developer-portal.driver-vehicle-licensing.api.gov.uk/
- Docs: https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service

**Need Help?**
- Check API logs: `grep "Registration lookup" vercel-logs`
- Test endpoint: `curl "https://your-domain.com/api/registration?reg=AB12CDE"`
- Frontend console: Check Network tab for API responses
