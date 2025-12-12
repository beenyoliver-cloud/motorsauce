This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Staging Password Gate

## Admin Debug Endpoints

- Set `ADMIN_API_KEY` in every environment (local `.env.local`, Vercel, CI, etc.). Use a long random string.
- When calling protected routes such as `/api/health`, `/api/debug-env`, `/api/debug-admin`, `/api/debug-business*`, include the header `x-admin-key: $ADMIN_API_KEY`.
- Requests without the correct header receive `403`, so remember to update any uptime monitors or scripts that hit those endpoints.

## Vehicle dataset (makes/models)

The forms can consume a simple JSON map of make → models from `public/vehicles.json`.

- Replace `public/vehicles.json` with your own exhaustive dataset to immediately update suggestions.
- For richer data (years, engine codes, chassis codes), also generate `public/vehicles-detailed.json`.

### Generate JSON from Excel

1. Prepare an Excel sheet (first sheet) with columns (case-insensitive):
	- Make, Model, From, To, ChassisCode, EngineCode, Fuel, DisplacementCC, OemPrefix
2. Install the converter dependency:
	- `npm i -D xlsx`
3. Run the converter:
	- `node scripts/convert-vehicles-xlsx.mjs path/to/input.xlsx`
4. This writes:
	- `public/vehicles.json` (simple map for dropdowns)
	- `public/vehicles-detailed.json` (nested rich structure for future enhancements)

Notes:
- The app lazily fetches `/vehicles.json` at runtime with a bundled fallback, so the UI updates without a rebuild.
- If your dataset grows large, consider splitting per-make JSON files in `public/vehicles/` and lazy-loading.

You can temporarily gate the entire site behind a password for staging or private reviews.

1. Set an environment variable `SITE_ACCESS_PASSWORD` (preferred) or `NEXT_PUBLIC_SITE_ACCESS_PASSWORD` in your hosting provider.
2. Deploy. Visitors will be redirected to `/access` to enter the password.
3. On success, the server sets an httpOnly cookie `site_access=granted` (valid 7 days) and the site is unlocked for that browser.
4. Change or remove the env to revoke access globally.

Middleware excludes assets (`/_next`, `/images`, favicon, sitemap) and the access endpoints (`/access`, `/api/access`).

## Stable Seller Links

Listings now include `sellerId` and `SellerLink` prefers `/profile/id/{id}` which redirects to `/profile/{username}`. This keeps links stable even if a seller renames their profile.
