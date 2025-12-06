# Hero Image Setup

The hero section has been updated to use a background image. To complete this setup:

1. **Save the hero image** as: `public/images/hero-bmw.jpg`
   - The image you provided (BMW on track at sunset with "MOTORSOURCE" text)
   - Place it directly in the `public/images/` folder

2. **The hero component** now uses:
   - Background image positioned right with `backgroundPosition: 'center right'`
   - Dark gradient overlay (`from-black/70 via-black/50 to-transparent`) for text readability
   - White text on the dark overlay
   - Gold (#D4AF37) color scheme for buttons and accents
   - Responsive design with proper min heights

3. **Image requirements:**
   - Format: JPG, PNG, or WebP
   - Size: Ideally 1200px+ width for desktop
   - Landscape orientation works best with `center right` positioning
   - The BMW image works perfectly as it shows the car on the right side

4. **After placing the image:**
   - Rebuild: `npm run build`
   - Test locally: `npm run dev`
   - The hero will now display with the car image background

## What changed:
- ✨ Background image instead of white gradient
- 🎨 Dark overlay ensures text is always readable
- 💫 Enhanced visual appeal with the car imagery
- 🏎️ Maintains all functionality (search, filters, registration lookup)
- ✅ Responsive on mobile and desktop

## Colors updated:
- `bg-yellow-*` → `bg-gold-*`
- `border-yellow-*` → `border-gold-*`
- `ring-yellow-*` → `ring-gold-*`
- Focus rings now use elegant gold instead of yellow
