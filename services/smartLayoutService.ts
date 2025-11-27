import { FilamentData, LabelPreset, LABEL_PRESETS, PrintSettings, LabelTheme } from '../types';

/**
 * AI-Powered Smart Layout Engine
 * Analyzes filament data and recommends optimal label size and theme
 */

interface LayoutRecommendation {
    preset: LabelPreset;
    theme: LabelTheme;
    confidence: number;
    reasoning: string;
}

/**
 * Analyze content and recommend optimal label layout
 */
export const recommendLayout = (data: FilamentData): LayoutRecommendation => {
    const brandLength = data.brand.length;
    const materialLength = data.material.length;
    const colorLength = data.colorName.length;
    const hasNotes = data.notes.length > 0;

    // Calculate content complexity score
    const totalLength = brandLength + materialLength + colorLength;
    const complexityScore = totalLength + (hasNotes ? 20 : 0);

    let recommendedPreset: LabelPreset;
    let theme: LabelTheme;
    let reasoning: string;

    // Smart sizing logic
    if (complexityScore < 30) {
        // Short content - use compact label
        recommendedPreset = LABEL_PRESETS.find(p => p.id === '14x30') || LABEL_PRESETS[0];
        theme = LabelTheme.MINIMAL;
        reasoning = 'Compact label recommended for short text. Saves paper and looks clean.';
    } else if (complexityScore < 50) {
        // Medium content - balanced
        recommendedPreset = LABEL_PRESETS.find(p => p.id === '12x40') || LABEL_PRESETS[0];
        theme = data.hygroscopy === 'high' ? LabelTheme.MAINTENANCE : LabelTheme.SWATCH;
        reasoning = 'Balanced layout for standard filament info with color swatch.';
    } else if (complexityScore < 70) {
        // Long content - need more space
        recommendedPreset = LABEL_PRESETS.find(p => p.id === '14x50') || LABEL_PRESETS[2];
        theme = LabelTheme.TECHNICAL;
        reasoning = 'Extended label for detailed information including temperatures.';
    } else {
        // Very detailed - use largest
        recommendedPreset = LABEL_PRESETS.find(p => p.id === '40x30') || LABEL_PRESETS[5];
        theme = LabelTheme.BOLD;
        reasoning = 'Large label for comprehensive filament documentation.';
    }

    // Hygroscopy-based theme override
    if (data.hygroscopy === 'high' && theme !== LabelTheme.MAINTENANCE) {
        theme = LabelTheme.MAINTENANCE;
        reasoning += ' ⚠️ Moisture-sensitive material detected - using warning theme.';
    }

    // Brand-focused override for well-known brands
    const premiumBrands = ['Polymaker', 'Prusament', 'eSun', 'Bambu Lab'];
    if (premiumBrands.some(b => data.brand.includes(b))) {
        theme = LabelTheme.BOLD;
        reasoning += ' 🏆 Premium brand detected - using bold branding theme.';
    }

    const confidence = calculateConfidence(data, recommendedPreset);

    return {
        preset: recommendedPreset,
        theme,
        confidence,
        reasoning
    };
};

/**
 * Calculate confidence score for recommendation
 */
const calculateConfidence = (data: FilamentData, preset: LabelPreset): number => {
    let score = 80; // Base confidence

    // Increase confidence if we have complete data
    if (data.minTemp && data.maxTemp) score += 5;
    if (data.bedTempMin && data.bedTempMax) score += 5;
    if (data.colorHex !== '#FFFFFF') score += 5;
    if (data.source) score += 5;

    return Math.min(100, score);
};

/**
 * Generate optimal print settings based on content analysis
 */
export const recommendPrintSettings = (
    data: FilamentData,
    preset: LabelPreset
): Partial<PrintSettings> => {
    const settings: Partial<PrintSettings> = {
        density: 50,
        includeQr: false,
        invert: false,
        marginMm: 2
    };

    // High density for small labels
    if (preset.heightMm <= 14) {
        settings.density = 65;
    }

    // Include QR for detailed tracking
    if (data.uuid || data.purchaseDate) {
        settings.includeQr = true;
    }

    // Larger margins for wide labels
    if (preset.widthMm >= 40) {
        settings.marginMm = 3;
    }

    return settings;
};

/**
 * Batch content analysis - analyze multiple filaments and group by optimal settings
 */
export const analyzeBatchContent = (filaments: FilamentData[]): {
    groups: Map<string, FilamentData[]>;
    recommendations: Map<string, LayoutRecommendation>;
} => {
    const groups = new Map<string, FilamentData[]>();
    const recommendations = new Map<string, LayoutRecommendation>();

    filaments.forEach(filament => {
        const rec = recommendLayout(filament);
        const groupKey = `${rec.preset.id}-${rec.theme}`;

        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
            recommendations.set(groupKey, rec);
        }

        groups.get(groupKey)!.push(filament);
    });

    return { groups, recommendations };
};

/**
 * Smart field visibility recommendations
 */
export const recommendVisibleFields = (data: FilamentData): PrintSettings['visibleFields'] => {
    return {
        brand: true, // Always show brand
        weight: data.weight !== '1kg', // Show if non-standard
        notes: data.notes.length > 0,
        date: Boolean(data.openDate || data.purchaseDate),
        source: Boolean(data.source && data.confidence && data.confidence < 80) // Show source if AI-detected with low confidence
    };
};

/**
 * Predict label count needed based on spool size
 */
export const predictLabelCount = (spoolWeight: string): number => {
    const weight = parseFloat(spoolWeight);

    if (weight >= 3) return 2; // Large spools get 2 labels (front/back)
    if (weight >= 1) return 1;
    return 1; // Samples get 1
};

/**
 * Generate smart label title based on content
 */
export const generateSmartTitle = (data: FilamentData): string => {
    const parts = [data.brand, data.material];

    if (data.colorName !== 'White' && data.colorName !== 'Black') {
        parts.push(data.colorName);
    }

    return parts.join(' ');
};
