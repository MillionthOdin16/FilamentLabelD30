import { FilamentData, HistoryEntry, PrintSettings } from '../types';

/**
 * Advanced Search and Analytics Service
 * Provides intelligent search, filtering, and insights for print history
 */

export interface SearchFilters {
    material?: string;
    brand?: string;
    color?: string;
    dateFrom?: number;
    dateTo?: number;
    hygroscopy?: 'low' | 'medium' | 'high';
    minTemp?: { min: number; max: number };
    source?: string;
    hasNotes?: boolean;
}

export interface SearchResult {
    entries: HistoryEntry[];
    totalCount: number;
    filteredCount: number;
}

export interface PrintAnalytics {
    totalLabels: number;
    uniqueMaterials: number;
    uniqueBrands: number;
    mostPrintedMaterial: string;
    mostPrintedBrand: string;
    averageLabelsPerWeek: number;
    materialDistribution: Map<string, number>;
    brandDistribution: Map<string, number>;
    colorPopularity: Map<string, number>;
    insights: string[];
}

/**
 * Advanced search with multi-criteria filtering
 */
export const searchHistory = (
    history: HistoryEntry[],
    query: string,
    filters: SearchFilters = {}
): SearchResult => {
    let results = [...history];

    // Text search across all fields
    if (query) {
        const lowerQuery = query.toLowerCase();
        results = results.filter(entry => {
            const data = entry.data;
            return (
                data.brand.toLowerCase().includes(lowerQuery) ||
                data.material.toLowerCase().includes(lowerQuery) ||
                data.colorName.toLowerCase().includes(lowerQuery) ||
                data.notes.toLowerCase().includes(lowerQuery)
            );
        });
    }

    // Apply filters
    if (filters.material) {
        results = results.filter(e =>
            e.data.material.toLowerCase() === filters.material!.toLowerCase()
        );
    }

    if (filters.brand) {
        results = results.filter(e =>
            e.data.brand.toLowerCase().includes(filters.brand!.toLowerCase())
        );
    }

    if (filters.color) {
        results = results.filter(e =>
            e.data.colorName.toLowerCase().includes(filters.color!.toLowerCase())
        );
    }

    if (filters.dateFrom) {
        results = results.filter(e => e.timestamp >= filters.dateFrom!);
    }

    if (filters.dateTo) {
        results = results.filter(e => e.timestamp <= filters.dateTo!);
    }

    if (filters.hygroscopy) {
        results = results.filter(e => e.data.hygroscopy === filters.hygroscopy);
    }

    if (filters.minTemp) {
        results = results.filter(e =>
            e.data.minTemp >= filters.minTemp!.min &&
            e.data.minTemp <= filters.minTemp!.max
        );
    }

    if (filters.hasNotes !== undefined) {
        results = results.filter(e =>
            filters.hasNotes ? e.data.notes.length > 0 : e.data.notes.length === 0
        );
    }

    return {
        entries: results,
        totalCount: history.length,
        filteredCount: results.length
    };
};

/**
 * Generate comprehensive analytics from print history
 */
export const generateAnalytics = (history: HistoryEntry[]): PrintAnalytics => {
    const materialMap = new Map<string, number>();
    const brandMap = new Map<string, number>();
    const colorMap = new Map<string, number>();

    history.forEach(entry => {
        const { material, brand, colorName } = entry.data;

        materialMap.set(material, (materialMap.get(material) || 0) + 1);
        brandMap.set(brand, (brandMap.get(brand) || 0) + 1);
        colorMap.set(colorName, (colorMap.get(colorName) || 0) + 1);
    });

    const mostPrintedMaterial = getMostFrequent(materialMap);
    const mostPrintedBrand = getMostFrequent(brandMap);

    // Calculate weekly average
    const oldestTimestamp = Math.min(...history.map(h => h.timestamp));
    const newestTimestamp = Math.max(...history.map(h => h.timestamp));

    // Ensure at least one week is used as the divisor to prevent inflated numbers for short history
    // (e.g., 3 labels in 5 minutes shouldn't result in 10,000 labels/week)
    const rawWeeksDiff = (newestTimestamp - oldestTimestamp) / (7 * 24 * 60 * 60 * 1000);
    const weeksDiff = Math.max(1, rawWeeksDiff);

    const averageLabelsPerWeek = history.length / weeksDiff;

    const insights = generateInsights(history, materialMap, brandMap, colorMap);

    return {
        totalLabels: history.length,
        uniqueMaterials: materialMap.size,
        uniqueBrands: brandMap.size,
        mostPrintedMaterial,
        mostPrintedBrand,
        averageLabelsPerWeek: Math.round(averageLabelsPerWeek * 10) / 10,
        materialDistribution: materialMap,
        brandDistribution: brandMap,
        colorPopularity: colorMap,
        insights
    };
};

/**
 * Generate actionable insights from analytics
 */
const generateInsights = (
    history: HistoryEntry[],
    materials: Map<string, number>,
    brands: Map<string, number>,
    colors: Map<string, number>
): string[] => {
    const insights: string[] = [];

    // Material insights
    const plaCount = materials.get('PLA') || 0;
    const petgCount = materials.get('PETG') || 0;
    const absCount = materials.get('ABS') || 0;

    if (plaCount > history.length * 0.6) {
        insights.push(`🎯 You're a PLA enthusiast! ${Math.round(plaCount / history.length * 100)}% of your collection`);
    }

    if (petgCount > plaCount) {
        insights.push('💪 PETG dominates your collection - you like strong functional prints!');
    }

    if (absCount > 0) {
        insights.push('🔥 ABS detected - you have proper ventilation for engineering-grade materials');
    }

    // Brand loyalty
    const topBrand = getMostFrequent(brands);
    const topBrandCount = brands.get(topBrand) || 0;
    if (topBrandCount > history.length * 0.4) {
        insights.push(`🏆 ${topBrand} superfan! They represent ${Math.round(topBrandCount / history.length * 100)}% of your spools`);
    }

    // Color preferences
    const topColor = getMostFrequent(colors);
    if (topColor !== 'Black' && topColor !== 'White') {
        insights.push(`🎨 ${topColor} is your signature color!`);
    }

    // Collection size insights
    if (history.length >= 50) {
        insights.push('🗄️ Impressive collection! You\'re a serious maker with 50+ spools catalogued');
    } else if (history.length >= 20) {
        insights.push('📦 Growing collection - you\'re building a solid filament library');
    }

    // Hygroscopic material warning
    const hygroscopicCount = history.filter(h => h.data.hygroscopy === 'high').length;
    if (hygroscopicCount > 5) {
        insights.push(`⚠️ ${hygroscopicCount} moisture-sensitive materials detected. Keep them dry!`);
    }

    // Recent activity
    const recentEntries = history.filter(h =>
        Date.now() - h.timestamp < 7 * 24 * 60 * 60 * 1000
    );
    if (recentEntries.length >= 5) {
        insights.push('🔥 You\'ve been on a labeling spree! 5+ labels in the past week');
    }

    return insights;
};

/**
 * Get most frequent item from map
 */
const getMostFrequent = (map: Map<string, number>): string => {
    let max = 0;
    let maxKey = '';

    map.forEach((count, key) => {
        if (count > max) {
            max = count;
            maxKey = key;
        }
    });

    return maxKey;
};

/**
 * Smart suggestions based on history
 */
export const getSuggestedMaterials = (history: HistoryEntry[]): string[] => {
    const materialMap = new Map<string, number>();
    history.forEach(entry => {
        const mat = entry.data.material;
        materialMap.set(mat, (materialMap.get(mat) || 0) + 1);
    });

    return Array.from(materialMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([material]) => material);
};

/**
 * Find similar filaments in history
 */
export const findSimilar = (data: FilamentData, history: HistoryEntry[], limit = 5): HistoryEntry[] => {
    const scored = history.map(entry => ({
        entry,
        score: calculateSimilarity(data, entry.data)
    }));

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.entry);
};

/**
 * Calculate similarity score between two filaments
 */
const calculateSimilarity = (a: FilamentData, b: FilamentData): number => {
    let score = 0;

    if (a.material === b.material) score += 40;
    if (a.brand === b.brand) score += 30;
    if (a.colorName === b.colorName) score += 20;
    if (a.hygroscopy === b.hygroscopy) score += 10;

    // Temperature similarity
    const tempDiff = Math.abs(a.minTemp - b.minTemp);
    if (tempDiff < 10) score += 10;

    return score;
};
