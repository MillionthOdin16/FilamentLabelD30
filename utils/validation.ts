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
 * @param hex - Hex color string (3 or 6 characters, with or without #)
 * @returns Normalized hex string or default
 */
export const normalizeHexColor = (hex: string): string => {
  if (!hex) return '#FFFFFF';
  const cleaned = hex.trim().toUpperCase().replace('#', '');
  
  // Expand 3-character hex to 6-character
  if (cleaned.length === 3) {
    const expanded = cleaned.split('').map(c => c + c).join('');
    return `#${expanded}`;
  }
  
  // Return 6-character hex
  if (cleaned.length === 6) {
    return `#${cleaned}`;
  }
  
  // Invalid format, return default
  return '#FFFFFF';
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

// Maximum reasonable temperature range for 3D printing
const MAX_TEMPERATURE_RANGE = 100;

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
  if (maxTemp - minTemp > MAX_TEMPERATURE_RANGE) {
    return `Temperature range seems unusually large (max ${MAX_TEMPERATURE_RANGE}°C range recommended)`;
  }
  return null;
};

/**
 * Sanitizes text input to prevent XSS
 * NOTE: This is a basic sanitization for plain text fields.
 * For HTML content, use a library like DOMPurify.
 * This function is intentionally conservative and may remove legitimate text.
 * @param input - Text input
 * @returns Sanitized text
 */
export const sanitizeTextInput = (input: string): string => {
  if (!input) return '';
  
  let sanitized = input;
  
  // Remove dangerous URL schemes (repeatedly to handle nested attempts)
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  let previousValue = '';
  while (previousValue !== sanitized) {
    previousValue = sanitized;
    dangerousSchemes.forEach(scheme => {
      const regex = new RegExp(scheme, 'gi');
      sanitized = sanitized.replace(regex, '');
    });
  }
  
  // Remove HTML tags and angle brackets
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Remove event handler attributes (repeatedly to handle overlapping patterns)
  // Match patterns like: on*, ON*, On*, etc.
  previousValue = '';
  while (previousValue !== sanitized) {
    previousValue = sanitized;
    sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');
  }
  
  // Trim and limit length
  return sanitized.trim().slice(0, 500);
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
