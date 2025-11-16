# Required Environment Variables

## Production (Vercel)

### Critical - Must be set for site to function:

```bash
# Supabase Configuration (required for all database/auth operations)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role (required for admin operations and listings API fallback)
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin API Key (required for /api/seed and /api/test-db routes)
ADMIN_API_KEY=your-secure-random-string
```

### Optional - Site works without these:

```bash
# Listings API Service Role Mode (optional fallback if RLS issues occur)
# Set to "1" to use service-role client instead of anon for listings API
LISTINGS_USE_SERVICE_ROLE=1

# Site URL (auto-detected from VERCEL_URL if not set)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Symptoms of Missing Environment Variables

| Missing Var | Symptom |
|------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | - Empty homepage (no listings)<br>- Login hangs indefinitely<br>- All database operations fail silently |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | - Same as missing URL<br>- Client-side Supabase calls fail |
| `SUPABASE_SERVICE_ROLE` | - Admin operations fail<br>- Listings API returns errors if LISTINGS_USE_SERVICE_ROLE=1 |
| `ADMIN_API_KEY` | - Seed endpoint returns 403<br>- Test DB endpoint returns 403 |

## Verification

### Check if variables are set:
Visit `/api/debug-env` in production - shows which env vars are present (without exposing values)

### Test critical functionality:
1. **Listings load when logged out** → `NEXT_PUBLIC_*` vars are correct
2. **Login works quickly** → Auth env vars correct
3. **Can create/edit listings** → Service role configured
4. **Messages work** → Full Supabase stack operational

## Development (.env.local)

Copy from `.env.local.example` or create:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key
ADMIN_API_KEY=dev-admin-key-123
```

**Note:** Never commit `.env.local` to git. It's in `.gitignore`.
