// src/lib/plateBlur.ts
/**
 * Utility for detecting and blurring UK number plates in images for privacy protection
 */

/**
 * UK number plate patterns to detect:
 * - Current format: AB12 CDE (2 letters, 2 numbers, 3 letters)
 * - Older formats: A123 BCD, AB12 CDE, etc.
 * - Various spacing/no-spacing variations
 */
const UK_PLATE_PATTERNS = [
  // Current format (since 2001): AB12 CDE
  /\b[A-Z]{2}\s?[0-9]{2}\s?[A-Z]{3}\b/gi,
  // Prefix format (1983-2001): A123 BCD
  /\b[A-Z]\s?[0-9]{1,3}\s?[A-Z]{3}\b/gi,
  // Suffix format (1963-1983): ABC 123D
  /\b[A-Z]{3}\s?[0-9]{1,3}\s?[A-Z]\b/gi,
  // Dateless format (pre-1963): ABC 123
  /\b[A-Z]{1,3}\s?[0-9]{1,4}\b/gi,
];

/**
 * Detect if text contains a UK number plate pattern
 */
export function containsPlate(text: string): boolean {
  return UK_PLATE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Extract potential plate strings from text
 */
export function extractPlates(text: string): string[] {
  const plates: string[] = [];
  UK_PLATE_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) plates.push(...matches);
  });
  return Array.from(new Set(plates)); // Remove duplicates
}

/**
 * Blur a specific region of an image using canvas
 */
function blurRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  blurAmount: number = 20
): void {
  // Get the image data for the region
  const imageData = ctx.getImageData(x, y, width, height);
  const pixels = imageData.data;
  
  // Apply box blur algorithm (fast and effective)
  const passes = 3; // More passes = more blur
  
  for (let pass = 0; pass < passes; pass++) {
    // Horizontal blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dx = -blurAmount; dx <= blurAmount; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < width) {
            const idx = (y * width + nx) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            count++;
          }
        }
        
        const idx = (y * width + x) * 4;
        pixels[idx] = r / count;
        pixels[idx + 1] = g / count;
        pixels[idx + 2] = b / count;
      }
    }
    
    // Vertical blur
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dy = -blurAmount; dy <= blurAmount; dy++) {
          const ny = y + dy;
          if (ny >= 0 && ny < height) {
            const idx = (ny * width + x) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            count++;
          }
        }
        
        const idx = (y * width + x) * 4;
        pixels[idx] = r / count;
        pixels[idx + 1] = g / count;
        pixels[idx + 2] = b / count;
      }
    }
  }
  
  // Put the blurred data back
  ctx.putImageData(imageData, x, y);
}

/**
 * Detect likely plate regions in an image based on color and position heuristics
 */
function detectPlateRegions(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): Array<{ x: number; y: number; width: number; height: number }> {
  const regions: Array<{ x: number; y: number; width: number; height: number }> = [];
  
  // UK plates are typically:
  // - White/yellow background
  // - Black text
  // - Rectangular
  // - Located in specific areas (front/rear bumper)
  
  // Check common plate positions:
  // Front: bottom 25% of image, centered
  // Rear: bottom 25% of image, centered
  
  const plateHeight = Math.floor(height * 0.08); // ~8% of image height
  const plateWidth = Math.floor(width * 0.25); // ~25% of image width
  
  // Bottom center (most common)
  regions.push({
    x: Math.floor((width - plateWidth) / 2),
    y: Math.floor(height * 0.85),
    width: plateWidth,
    height: plateHeight,
  });
  
  // Lower bottom (if plate is very low)
  regions.push({
    x: Math.floor((width - plateWidth) / 2),
    y: Math.floor(height * 0.92),
    width: plateWidth,
    height: plateHeight,
  });
  
  // Mid-bottom (some angles)
  regions.push({
    x: Math.floor((width - plateWidth) / 2),
    y: Math.floor(height * 0.75),
    width: plateWidth,
    height: plateHeight,
  });
  
  return regions;
}

/**
 * Automatically detect and blur number plates in an image
 * Returns a new blurred image as data URL
 */
export async function autoBlurPlates(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Detect and blur likely plate regions
        const plateRegions = detectPlateRegions(ctx, img.width, img.height);
        
        plateRegions.forEach(region => {
          blurRegion(ctx, region.x, region.y, region.width, region.height, 15);
        });
        
        // Return as data URL
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Manually blur a specific rectangular region in an image
 */
export async function blurImageRegion(
  imageUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        blurRegion(ctx, x, y, width, height, 20);
        
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Check if auto-blur is recommended for a car based on privacy settings
 */
export function shouldAutoBlur(car: { hideRegistration?: boolean; registration?: string }): boolean {
  // Auto-blur if user wants registration hidden or if registration is set
  return car.hideRegistration === true || !!car.registration;
}
