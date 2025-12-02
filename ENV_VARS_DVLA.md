# DVLA Registration Lookup

Add these to `.env.local` and your production environment:

DVLA_API_KEY=your_dvla_api_key
DVLA_ENDPOINT=https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles

Implementation notes:
- The new endpoint `/api/garage/registration-lookup` reads these vars and calls DVLA.
- If not set, the route returns 501 with X-Feature: dvla-registration-lookup.
- `src/app/api/registration/route.ts` now forwards to the unified route for consistency.
- `src/components/EnhancedVehicleForm.tsx` uses the unified route to pre-fill make/model/year/trim.
