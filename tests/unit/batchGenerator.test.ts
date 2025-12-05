
import { describe, it, expect } from 'vitest';
import { generateBatchJobs } from '../../services/batchGeneratorService';
import { mockFilaments } from '../fixtures/filaments';
import { HistoryEntry, FilamentData } from '../../types';

describe('Batch Generator Logic', () => {
    it('should generate jobs for all selected filaments', () => {
        // Create mock history
        const history: HistoryEntry[] = mockFilaments.map((f, i) => ({
            id: `id-${i}`,
            timestamp: Date.now(),
            data: f
        }));

        const result = generateBatchJobs(mockFilaments, history, {
            optimizeOrder: false,
            autoRecommendSettings: false,
            includeQrCodes: false,
            addTimeStamps: false,
            skipDuplicates: false
        });

        expect(result.jobs.length).toBe(3);
        expect(result.jobs[0].label.brand).toBe('Polymaker');
    });

    it('should skip duplicates if option enabled', () => {
        // Create 2 items. One is in history (duplicate), one is new.
        const oldItem = mockFilaments[0];
        const newItem = { ...mockFilaments[1], brand: 'BrandNew' };

        const selection = [oldItem, newItem];

        // History only contains the old item
        const history: HistoryEntry[] = [{
            id: 'old-1',
            timestamp: Date.now(), // Recently printed
            data: oldItem
        }];

        const result = generateBatchJobs(selection, history, {
            optimizeOrder: false,
            autoRecommendSettings: false,
            includeQrCodes: false,
            addTimeStamps: false,
            skipDuplicates: true
        });

        // Should produce 1 job (the new item) and skip the old one
        expect(result.jobs.length).toBe(1);
        expect(result.jobs[0].label.brand).toBe('BrandNew');
        expect(result.optimizations.some(o => o.includes('Skipped'))).toBe(true);
    });
});
