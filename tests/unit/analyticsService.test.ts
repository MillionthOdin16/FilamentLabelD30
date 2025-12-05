import { describe, it, expect } from 'vitest';
import { generateAnalytics, searchHistory } from '../../services/analyticsService';
import { HistoryEntry } from '../../types';

// Mock Data Helper
const createMockEntry = (id: string, timestamp: number, brand: string, material: string, notes: string = ''): HistoryEntry => ({
    id,
    timestamp,
    data: {
        brand,
        material,
        colorName: 'Black',
        colorHex: '#000000',
        minTemp: 200,
        maxTemp: 220,
        bedTempMin: 50,
        bedTempMax: 60,
        weight: '1kg',
        notes,
        hygroscopy: 'low'
    }
});

describe('Analytics Service', () => {
    describe('generateAnalytics', () => {
        it('should handle empty history gracefully', () => {
            const result = generateAnalytics([]);
            expect(result.totalLabels).toBe(0);
            expect(result.uniqueMaterials).toBe(0);
            expect(result.averageLabelsPerWeek).toBe(0); // 0 / 1 = 0
        });

        it('should calculate averages correctly for short timeframe (clamped to 1 week)', () => {
            const now = Date.now();
            const history = [
                createMockEntry('1', now, 'Bambu', 'PLA'),
                createMockEntry('2', now + 1000, 'Bambu', 'PLA'), // 1 second later
                createMockEntry('3', now + 2000, 'Bambu', 'PLA'),
            ];
            // Weeks diff should be clamped to 1.
            // Avg = 3 / 1 = 3.
            const result = generateAnalytics(history);
            expect(result.averageLabelsPerWeek).toBe(3);
        });

        it('should calculate averages correctly for multi-week span', () => {
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const history = [
                createMockEntry('1', now, 'Bambu', 'PLA'),
                createMockEntry('2', now + oneWeek, 'Bambu', 'PLA'), // Exactly 1 week later
                createMockEntry('3', now + (oneWeek * 2), 'Bambu', 'PLA'), // 2 weeks later
            ];
            // Span is 2 weeks. Total items 3.
            // Avg = 3 / 2 = 1.5
            const result = generateAnalytics(history);
            expect(result.averageLabelsPerWeek).toBe(1.5);
        });

        it('should identify most printed material correctly', () => {
            const history = [
                createMockEntry('1', 0, 'A', 'PLA'),
                createMockEntry('2', 0, 'A', 'PETG'),
                createMockEntry('3', 0, 'A', 'PLA'),
            ];
            const result = generateAnalytics(history);
            expect(result.mostPrintedMaterial).toBe('PLA');
            expect(result.materialDistribution.get('PLA')).toBe(2);
            expect(result.materialDistribution.get('PETG')).toBe(1);
        });
    });

    describe('searchHistory', () => {
        const history = [
            createMockEntry('1', 1000, 'Prusa', 'PETG'),
            createMockEntry('2', 2000, 'Bambu', 'PLA'),
            createMockEntry('3', 3000, 'Sunlu', 'PLA', 'Special Notes'),
        ];

        it('should filter by brand case-insensitive', () => {
            const result = searchHistory(history, 'prusa');
            expect(result.entries).toHaveLength(1);
            expect(result.entries[0].data.brand).toBe('Prusa');
        });

        it('should filter by material', () => {
            const result = searchHistory(history, 'PLA');
            expect(result.entries).toHaveLength(2);
        });

        it('should filter by notes content', () => {
            const result = searchHistory(history, 'special');
            expect(result.entries).toHaveLength(1);
            expect(result.entries[0].id).toBe('3');
        });

        it('should return all records for empty query', () => {
            const result = searchHistory(history, '');
            expect(result.filteredCount).toBe(3);
        });

        it('should handle no matches', () => {
            const result = searchHistory(history, 'NonExistentBrand');
            expect(result.filteredCount).toBe(0);
        });
    });
});
