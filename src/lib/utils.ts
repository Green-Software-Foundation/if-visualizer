import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates an array of HSL colors based on a primary color
 * @param {number} count - Number of colors to generate (1-10 recommended)
 * @param {Object} options - Configuration options
 * @param {number} options.hue - Base hue value (0-360)
 * @param {number} options.saturation - Base saturation value (0-100)
 * @param {number} options.lightness - Base lightness value (0-100)
 * @param {string} options.variation - Type of variation: 'lightness', 'saturation', or 'both'
 * @returns {string[]} Array of HSL color strings
 */
export const generateColorScale = (count: number, {
  hue = 178,
  saturation = 100,
  lightness = 21,
  variation = "both"
}): string[] => {

  // Ensure count is between 1 and 10
  const colorCount = Math.max(1, Math.min(10, count));

  // Define variation ranges
  const lightnessRange = {
    min: 14,
    max: 86
  };

  const saturationRange = {
    min: 20,
    max: 100
  };

  const colors = [];

  for (let i = 0; i < colorCount; i++) {
    let newSaturation = saturation;
    let newLightness = lightness;

    const progress = i / (colorCount - 1 || 1);

    switch (variation) {
      case 'lightness':
        newLightness = lightnessRange.min + (lightnessRange.max - lightnessRange.min) * progress;
        break;
      case 'saturation':
        newSaturation = saturationRange.max - (saturationRange.max - saturationRange.min) * progress;
        break;
      case 'both':
        if (i < colorCount / 2) {
          // First half: vary lightness
          newLightness = lightnessRange.min + (lightness - lightnessRange.min) * (i / (colorCount / 2));
        } else {
          // Second half: vary both lightness and saturation
          const secondHalfProgress = (i - colorCount / 2) / (colorCount / 2);
          newSaturation = saturation - (saturation - saturationRange.min) * secondHalfProgress;
          newLightness = lightness + (lightnessRange.max - lightness) * secondHalfProgress;
        }
        break;
    }

    colors.push(`hsl(${hue} ${Math.round(newSaturation)}% ${Math.round(newLightness)}%)`);
  }

  return colors;
};