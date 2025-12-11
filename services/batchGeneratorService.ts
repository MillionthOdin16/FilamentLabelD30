import { FilamentData, HistoryEntry, PrintJob, AdvancedPrintSettings, PrintSettings } from '../types';
import { recommendLayout, recommendPrintSettings } from './smartLayoutService';
import { analyzeBatchContent } from './smartLayoutService';

/**
 * Batch Label Generator
 * Generate optimized print jobs for multiple filaments
 */

export interface BatchGenerationOptions {
    optimizeOrder: boolean; // Group by label size to minimize waste
    autoRecommendSettings: boolean; // Use AI recommendations
    includeQrCodes: boolean; // Add QR codes to all labels
    addTimeStamps: boolean; // Add generation date
    skipDuplicates: boolean; // Skip if recently printed
}

export interface BatchGenerationResult {
    jobs: PrintJob[];
    estimatedTime: number; // Total print time in seconds
    paperUsage: {
        totalLabels: number;
        labelsBySize: Map<string, number>;
        estimatedLengthMm: number;
    };
    optimizations: string[];
}

/**
 * Generate batch print jobs from filament collection
 */
export const generateBatchJobs = (
    filaments: FilamentData[],
    history: HistoryEntry[],
    options: BatchGenerationOptions = {
        optimizeOrder: true,
        autoRecommendSettings: true,
        includeQrCodes: false,
        addTimeStamps: true,
        skipDuplicates: false
    }
): BatchGenerationResult => {
    let processedFilaments = [...filaments];
    const optimizations: string[] = [];

    // Skip duplicates if requested
    if (options.skipDuplicates) {
        const recentlyPrinted = new Set(
            history
                .filter(h => Date.now() - h.timestamp < 24 * 60 * 60 * 1000) // Last 24h
                .map(h => `${h.data.brand}-${h.data.material}-${h.data.colorName}`)
        );

        const originalCount = processedFilaments.length;
        processedFilaments = processedFilaments.filter(f =>
            !recentlyPrinted.has(`${f.brand}-${f.material}-${f.colorName}`)
        );

        if (originalCount > processedFilaments.length) {
            optimizations.push(
                `Skipped ${originalCount - processedFilaments.length} recently printed labels`
            );
        }
    }

    // Analyze and group by optimal settings
    const { groups, recommendations } = analyzeBatchContent(processedFilaments);

    if (options.optimizeOrder) {
        optimizations.push(
            `Grouped into ${groups.size} batches by optimal label size - minimizes paper waste`
        );
    }

    // Generate print jobs
    const jobs: PrintJob[] = [];
    let totalEstimatedTime = 0;
    const labelsBySize = new Map<string, number>();

    groups.forEach((filamentGroup, groupKey) => {
        const recommendation = recommendations.get(groupKey)!;

        filamentGroup.forEach(filament => {
            const baseSettings: PrintSettings | AdvancedPrintSettings = options.autoRecommendSettings
                ? {
                    ...recommendPrintSettings(filament, recommendation.preset),
                    theme: recommendation.theme,
                    copies: 1,
                    includeQr: options.includeQrCodes,
                    speed: 3, // Medium speed for batch
                    labelType: 'gap',
                    justification: 'center',
                    autoCalibrate: false,
                    qualityMode: 'normal',
                    widthMm: recommendation.preset.widthMm,
                    heightMm: recommendation.preset.heightMm
                } as AdvancedPrintSettings
                : {
                    copies: 1,
                    invert: false,
                    includeQr: options.includeQrCodes,
                    density: 50,
                    theme: recommendation.theme,
                    marginMm: 2,
                    visibleFields: {
                        brand: true,
                        weight: true,
                        notes: true,
                        date: options.addTimeStamps,
                        source: false
                    },
                    widthMm: recommendation.preset.widthMm,
                    heightMm: recommendation.preset.heightMm
                };

            const job: PrintJob = {
                id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                label: filament,
                settings: baseSettings,
                status: 'queued',
                progress: 0,
                estimatedTime: estimatePrintTime(recommendation.preset),
                createdAt: Date.now()
            };

            jobs.push(job);
            totalEstimatedTime += job.estimatedTime;

            // Track label sizes
            const size = `${recommendation.preset.widthMm}x${recommendation.preset.heightMm}`;
            labelsBySize.set(size, (labelsBySize.get(size) || 0) + 1);
        });
    });

    // Calculate paper usage
    const estimatedLengthMm = calculatePaperUsage(labelsBySize);

    if (options.autoRecommendSettings) {
        optimizations.push('AI-recommended optimal label sizes and themes for each filament');
    }

    if (jobs.length > 10) {
        optimizations.push(`Batch processing ${jobs.length} labels - ~${Math.round(totalEstimatedTime / 60)} minutes total`);
    }

    return {
        jobs,
        estimatedTime: totalEstimatedTime,
        paperUsage: {
            totalLabels: jobs.length,
            labelsBySize,
            estimatedLengthMm
        },
        optimizations
    };
};

/**
 * Estimate print time for a label
 */
const estimatePrintTime = (preset: any): number => {
    // Base time: 5 seconds
    // Add time based on label area
    const area = preset.widthMm * preset.heightMm;
    const areaFactor = area / 500; // Normalize to ~500mm² base

    return Math.round(5 + (areaFactor * 3)); // 5-15 seconds typical
};

/**
 * Calculate total paper usage
 */
const calculatePaperUsage = (labelsBySize: Map<string, number>): number => {
    let totalMm = 0;

    labelsBySize.forEach((count, size) => {
        const [width, height] = size.split('x').map(Number);
        // Use height (length along paper roll) + small gap
        totalMm += (height + 5) * count; // 5mm gap between labels
    });

    return totalMm;
};

/**
 * Generate smart batch name suggestion
 */
export const suggestBatchName = (filaments: FilamentData[]): string => {
    const materials = new Set(filaments.map(f => f.material));
    const brands = new Set(filaments.map(f => f.brand));

    if (brands.size === 1) {
        return `${Array.from(brands)[0]} Collection - ${filaments.length} spools`;
    }

    if (materials.size === 1) {
        return `${Array.from(materials)[0]} Batch - ${filaments.length} labels`;
    }

    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Label Batch ${date} - ${filaments.length} items`;
};

/**
 * Quick batch generators for common scenarios
 */

// Generate labels for all unlabeled spools
export const generateForUnlabeled = (
    allFilaments: FilamentData[],
    history: HistoryEntry[]
): FilamentData[] => {
    const labeledKeys = new Set(
        history.map(h => `${h.data.brand}-${h.data.material}-${h.data.colorName}`)
    );

    return allFilaments.filter(f =>
        !labeledKeys.has(`${f.brand}-${f.material}-${f.colorName}`)
    );
};

// Generate labels for specific material type
export const generateByMaterial = (
    allFilaments: FilamentData[],
    material: string
): FilamentData[] => {
    return allFilaments.filter(f =>
        f.material.toLowerCase() === material.toLowerCase()
    );
};

// Generate labels for moisture-sensitive materials
export const generateForHygroscopic = (
    allFilaments: FilamentData[]
): FilamentData[] => {
    return allFilaments.filter(f =>
        f.hygroscopy === 'high' || f.hygroscopy === 'medium'
    );
};

/**
 * Optimize print job order to minimize label size changes
 */
export const optimizePrintOrder = (jobs: PrintJob[]): PrintJob[] => {
    // Group by label size, then sort within groups
    const grouped = new Map<string, PrintJob[]>();

    jobs.forEach(job => {
        // Extract label size from settings
        const width = job.settings.widthMm || 0;
        const height = job.settings.heightMm || 0;
        const key = width && height ? `${width}x${height}` : 'default';

        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(job);
    });

    // Flatten back to  array
    const optimized: PrintJob[] = [];
    grouped.forEach(group => {
        optimized.push(...group);
    });

    return optimized;
};

/**
 * Split large batch into manageable chunks
 */
export const chunkBatch = (jobs: PrintJob[], maxPerChunk: number = 20): PrintJob[][] => {
    const chunks: PrintJob[][] = [];

    for (let i = 0; i < jobs.length; i += maxPerChunk) {
        chunks.push(jobs.slice(i, i + maxPerChunk));
    }

    return chunks;
};

/**
 * Generate summary report for batch
 */
export const generateBatchReport = (result: BatchGenerationResult): string => {
    const sizeBreakdown = Array.from(result.paperUsage.labelsBySize.entries())
        .map(([size, count]) => `  • ${size}mm: ${count} labels`)
        .join('\n');

    const rollChanges = Math.max(0, result.paperUsage.labelsBySize.size - 1);

    return `
🏷️ Batch Generation Report

📊 Overview:
  • Total Labels: ${result.paperUsage.totalLabels}
  • Estimated Time: ${Math.round(result.estimatedTime / 60)} minutes
  • Paper Usage: ~${Math.round(result.paperUsage.estimatedLengthMm / 10)}cm
  • Est. Roll Changes: ${rollChanges}

📏 Label Sizes:
${sizeBreakdown}

✨ Optimizations Applied:
${result.optimizations.map(opt => `  ✓ ${opt}`).join('\n')}
  `.trim();
};
