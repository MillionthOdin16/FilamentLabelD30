/**
 * Validation utilities for input fields
 */

/**
 * Validates a hex color code
 * @param hex - Hex color string (with or without #)
 * @returns boolean indicating if valid
 */
export const isValidHexColor = (hex: string): boolean => {
  if (!hex) return false;
  const hexRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(hex);
};

/**
 * Normalizes a hex color to include # prefix
 * @param hex - Hex color string
 * @returns Normalized hex string or default
 */
export const normalizeHexColor = (hex: string): string => {
  if (!hex) return '#FFFFFF';
  const cleaned = hex.trim().toUpperCase();
  if (cleaned.startsWith('#')) {
    return cleaned.length === 7 ? cleaned : '#FFFFFF';
  }
  return cleaned.length === 6 ? `#${cleaned}` : '#FFFFFF';
};

/**
 * Validates a temperature value
 * @param temp - Temperature in Celsius
 * @param min - Minimum allowed temperature
 * @param max - Maximum allowed temperature
 * @returns boolean indicating if valid
 */
export const isValidTemperature = (temp: number, min: number = 0, max: number = 500): boolean => {
  return !isNaN(temp) && temp >= min && temp <= max;
};

/**
 * Clamps a value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Validates temperature range
 * @param minTemp - Minimum temperature
 * @param maxTemp - Maximum temperature
 * @returns Error message if invalid, null otherwise
 */
export const validateTemperatureRange = (minTemp: number, maxTemp: number): string | null => {
  if (!isValidTemperature(minTemp) || !isValidTemperature(maxTemp)) {
    return 'Invalid temperature values';
  }
  if (minTemp > maxTemp) {
    return 'Minimum temperature cannot be greater than maximum temperature';
  }
  if (maxTemp - minTemp > 100) {
    return 'Temperature range seems unusually large';
  }
  return null;
};

/**
 * Sanitizes text input to prevent XSS
 * @param input - Text input
 * @returns Sanitized text
 */
export const sanitizeTextInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 500); // Limit length
};

/**
 * Validates material name
 * @param material - Material name
 * @returns boolean indicating if valid
 */
export const isValidMaterialName = (material: string): boolean => {
  if (!material || material.length < 2 || material.length > 50) return false;
  // Allow letters, numbers, spaces, hyphens, and plus signs
  const materialRegex = /^[A-Za-z0-9\s\-\+]+$/;
  return materialRegex.test(material);
};

/**
 * Validates brand name
 * @param brand - Brand name
 * @returns boolean indicating if valid
 */
export const isValidBrandName = (brand: string): boolean => {
  if (!brand || brand.length < 2 || brand.length > 50) return false;
  // Allow letters, numbers, spaces, common symbols
  const brandRegex = /^[A-Za-z0-9\s\-\&\®\™\.]+$/;
  return brandRegex.test(brand);
};
