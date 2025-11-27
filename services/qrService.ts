import QRCode from 'qrcode';
import { FilamentData, QRCodeConfig } from '../types';

/**
 * Generate QR code for filament label with inventory link
 */
export const generateFilamentQR = async (
    data: FilamentData,
    config: Partial<QRCodeConfig> = {}
): Promise<string> => {
    const qrConfig: QRCodeConfig = {
        type: config.type || 'url',
        data: config.data || generateInventoryURL(data),
        size: config.size || 'medium',
        errorCorrection: config.errorCorrection || 'M',
        includeInventoryLink: config.includeInventoryLink !== false,
        customSchema: config.customSchema
    };

    const qrOptions = {
        errorCorrectionLevel: qrConfig.errorCorrection,
        type: 'image/png' as const,
        quality: 1,
        margin: 1,
        width: getQRSize(qrConfig.size),
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    };

    try {
        return await QRCode.toDataURL(qrConfig.data, qrOptions);
    } catch (error) {
        console.error('QR Code generation failed:', error);
        throw new Error('Failed to generate QR code');
    }
};

/**
 * Generate inventory tracking URL for filament
 */
export const generateInventoryURL = (data: FilamentData): string => {
    const baseURL = window.location.origin;
    const params = new URLSearchParams({
        brand: data.brand,
        material: data.material,
        color: data.colorName,
        uuid: data.uuid || generateUUID()
    });

    return `${baseURL}/inventory?${params.toString()}`;
};

/**
 * Generate vCard format for compatibility with contact scanners
 */
export const generateVCard = (data: FilamentData): string => {
    return `BEGIN:VCARD
VERSION:3.0
FN:${data.brand} ${data.material}
ORG:${data.brand}
NOTE:Material: ${data.material}\\nColor: ${data.colorName}\\nTemp: ${data.minTemp}-${data.maxTemp}°C\\nBed: ${data.bedTempMin}-${data.bedTempMax}°C
END:VCARD`;
};

/**
 * Generate custom schema for slicer integration
 * Format: filament://brand/material/color?params
 */
export const generateSlicerSchema = (data: FilamentData): string => {
    const params = new URLSearchParams({
        minTemp: data.minTemp.toString(),
        maxTemp: data.maxTemp.toString(),
        bedMin: data.bedTempMin.toString(),
        bedMax: data.bedTempMax.toString(),
        hygroscopy: data.hygroscopy
    });

    return `filament://${encodeURIComponent(data.brand)}/${encodeURIComponent(data.material)}/${encodeURIComponent(data.colorName)}?${params.toString()}`;
};

// Helper functions
const getQRSize = (size: 'small' | 'medium' | 'large'): number => {
    switch (size) {
        case 'small': return 128;
        case 'medium': return 256;
        case 'large': return 512;
    }
};

const generateUUID = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Parse QR code data back to filament info
 */
export const parseFilamentQR = (qrData: string): Partial<FilamentData> | null => {
    try {
        // Try URL format first
        if (qrData.startsWith('http')) {
            const url = new URL(qrData);
            const params = url.searchParams;
            return {
                brand: params.get('brand') || undefined,
                material: params.get('material') || undefined,
                colorName: params.get('color') || undefined,
                uuid: params.get('uuid') || undefined
            };
        }

        // Try slicer schema format
        if (qrData.startsWith('filament://')) {
            const match = qrData.match(/filament:\/\/([^/]+)\/([^/]+)\/([^?]+)\?(.+)/);
            if (match) {
                const [, brand, material, color, paramsStr] = match;
                const params = new URLSearchParams(paramsStr);
                return {
                    brand: decodeURIComponent(brand),
                    material: decodeURIComponent(material),
                    colorName: decodeURIComponent(color),
                    minTemp: parseInt(params.get('minTemp') || '0'),
                    maxTemp: parseInt(params.get('maxTemp') || '0'),
                    bedTempMin: parseInt(params.get('bedMin') || '0'),
                    bedTempMax: parseInt(params.get('bedMax') || '0'),
                    hygroscopy: params.get('hygroscopy') as 'low' | 'medium' | 'high'
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Failed to parse QR code:', error);
        return null;
    }
};
