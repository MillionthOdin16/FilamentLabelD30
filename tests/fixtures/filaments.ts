
import { FilamentData } from '../../types';

export const mockFilaments: FilamentData[] = [
    {
        brand: 'Polymaker',
        material: 'PLA',
        colorName: 'Teal',
        colorHex: '#008080',
        minTemp: 190,
        maxTemp: 220,
        bedTempMin: 50,
        bedTempMax: 60,
        weight: '1kg',
        notes: 'Print cool',
        hygroscopy: 'low',
        source: 'Mock',
        openDate: '2025-01-01'
    },
    {
        brand: 'Prusament',
        material: 'PETG',
        colorName: 'Orange',
        colorHex: '#FFA500',
        minTemp: 230,
        maxTemp: 250,
        bedTempMin: 70,
        bedTempMax: 90,
        weight: '1kg',
        notes: '',
        hygroscopy: 'medium',
        source: 'Mock',
        openDate: '2025-01-02'
    },
    {
        brand: 'Bambu Lab',
        material: 'PAHT-CF',
        colorName: 'Black',
        colorHex: '#000000',
        minTemp: 260,
        maxTemp: 290,
        bedTempMin: 100,
        bedTempMax: 110,
        weight: '0.5kg',
        notes: 'Dry well',
        hygroscopy: 'high',
        source: 'Mock',
        openDate: '2025-01-03'
    }
];
