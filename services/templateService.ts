import { LabelTemplate, TemplateLayout, FilamentData } from '../types';

/**
 * Community Template Sharing Service
 * Import/Export label templates and share with community
 */

export interface TemplateExport {
    version: string;
    exportDate: number;
    templates: LabelTemplate[];
    metadata: {
        author: string;
        description: string;
        tags: string[];
    };
}

/**
 * Built-in premium templates
 */
export const PREMIUM_TEMPLATES: LabelTemplate[] = [
    {
        id: 'minimal-pro',
        name: 'Minimal Pro',
        description: 'Clean, professional look with just the essentials',
        category: 'minimal',
        author: 'FilamentID',
        layout: {
            elements: [
                { type: 'text', field: 'brand', x: 2, y: 2, fontSize: 10, fontWeight: 'bold', align: 'left' },
                { type: 'text', field: 'material', x: 2, y: 6, fontSize: 8, align: 'left' },
                { type: 'colorSwatch', field: 'colorHex', x: 30, y: 2, width: 8, height: 8 }
            ],
            backgroundColor: '#FFFFFF',
            borderStyle: 'none'
        },
        supportedSizes: ['12x40', '14x30'],
        tags: ['minimal', 'professional', 'compact'],
        createdAt: Date.now()
    },
    {
        id: 'tech-detailed',
        name: 'Technical Detailed',
        description: 'All specs visible for maximum reference',
        category: 'detailed',
        author: 'FilamentID',
        layout: {
            elements: [
                { type: 'text', field: 'brand', x: 2, y: 1, fontSize: 12, fontWeight: 'bold' },
                { type: 'text', field: 'material', x: 2, y: 6, fontSize: 10 },
                { type: 'divider', x: 0, y: 11, width: 100 },
                { type: 'text', field: 'minTemp', x: 2, y: 13, fontSize: 8 },
                { type: 'text', field: 'maxTemp', x: 15, y: 13, fontSize: 8 },
                { type: 'colorSwatch', field: 'colorHex', x: 35, y: 1, width: 10, height: 10 },
                { type: 'qr', field: 'custom', x: 48, y: 1, width: 10, height: 10 }
            ],
            backgroundColor: '#FFFFFF',
            borderStyle: 'solid',
            borderWidth: 1
        },
        supportedSizes: ['14x50', '40x30', '50x30'],
        tags: ['detailed', 'technical', 'comprehensive'],
        createdAt: Date.now()
    },
    {
        id: 'brand-showcase',
        name: 'Brand Showcase',
        description: 'Emphasizes brand with large logo area',
        category: 'brand',
        author: 'FilamentID',
        layout: {
            elements: [
                { type: 'text', field: 'brand', x: 5, y: 3, fontSize: 16, fontWeight: 'bold', align: 'center' },
                { type: 'text', field: 'material', x: 5, y: 12, fontSize: 10, align: 'center' },
                { type: 'text', field: 'colorName', x: 5, y: 18, fontSize: 8, align: 'center' },
                { type: 'colorSwatch', field: 'colorHex', x: 15, y: 25, width: 20, height: 5 }
            ],
            backgroundColor: '#FFFFFF',
            borderStyle: 'rounded',
            borderWidth: 2
        },
        supportedSizes: ['40x30', '50x30', '50x50'],
        tags: ['brand', 'showcase', 'premium'],
        createdAt: Date.now()
    },
    {
        id: 'grid-compact',
        name: 'Grid Compact',
        description: 'Maximum info in minimal space',
        category: 'grid',
        author: 'FilamentID',
        layout: {
            elements: [
                { type: 'text', field: 'brand', x: 1, y: 1, fontSize: 8, fontWeight: 'bold' },
                { type: 'text', field: 'material', x: 1, y: 5, fontSize: 7 },
                { type: 'text', field: 'colorName', x: 1, y: 8, fontSize: 6 },
                { type: 'colorSwatch', field: 'colorHex', x: 25, y: 1, width: 12, height: 10 },
                { type: 'icon', field: 'hygroscopy', x: 38, y: 1, icon: 'droplet' }
            ],
            backgroundColor: '#F5F5F5',
            borderStyle: 'dashed',
            borderWidth: 1
        },
        supportedSizes: ['12x40', '14x30', '14x50'],
        tags: ['grid', 'compact', 'efficient'],
        createdAt: Date.now()
    },
    {
        id: 'warning-maintenance',
        name: 'Warning & Maintenance',
        description: 'High visibility for special materials',
        category: 'custom',
        author: 'FilamentID',
        layout: {
            elements: [
                { type: 'icon', field: 'custom', x: 2, y: 2, icon: 'alert-triangle', customText: '⚠️' },
                { type: 'text', field: 'material', x: 8, y: 2, fontSize: 12, fontWeight: 'bold' },
                { type: 'text', field: 'brand', x: 8, y: 8, fontSize: 10 },
                { type: 'divider', x: 0, y: 14, width: 100 },
                { type: 'text', field: 'notes', x: 2, y: 16, fontSize: 7 },
                { type: 'colorSwatch', field: 'colorHex', x: 35, y: 2, width: 10, height: 10 }
            ],
            backgroundColor: '#FFF3CD',
            borderStyle: 'solid',
            borderWidth: 2
        },
        supportedSizes: ['14x50', '40x30'],
        tags: ['warning', 'maintenance', 'hygroscopic'],
        createdAt: Date.now()
    }
];

/**
 * Export templates to JSON
 */
export const exportTemplates = (
    templates: LabelTemplate[],
    metadata: TemplateExport['metadata']
): string => {
    const exportData: TemplateExport = {
        version: '1.0.0',
        exportDate: Date.now(),
        templates,
        metadata
    };

    return JSON.stringify(exportData, null, 2);
};

/**
 * Import templates from JSON
 */
export const importTemplates = (jsonString: string): LabelTemplate[] => {
    try {
        const data: TemplateExport = JSON.parse(jsonString);

        // Validate format
        if (!data.version || !data.templates || !Array.isArray(data.templates)) {
            throw new Error('Invalid template format');
        }

        // Add imported timestamp
        return data.templates.map(template => ({
            ...template,
            createdAt: data.exportDate,
            author: data.metadata?.author || 'Community'
        }));
    } catch (error) {
        console.error('Failed to import templates:', error);
        throw new Error('Invalid template file');
    }
};

/**
 * Download template pack as file
 */
export const downloadTemplatePack = (
    templates: LabelTemplate[],
    packName: string,
    metadata: TemplateExport['metadata']
): void => {
    const json = exportTemplates(templates, metadata);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${packName}-templates.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Upload and parse template pack
 */
export const uploadTemplatePack = (): Promise<LabelTemplate[]> => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                reject(new Error('No file selected'));
                return;
            }

            try {
                const text = await file.text();
                const templates = importTemplates(text);
                resolve(templates);
            } catch (error) {
                reject(error);
            }
        };

        input.click();
    });
};

/**
 * Filter templates by criteria
 */
export const filterTemplates = (
    templates: LabelTemplate[],
    filters: {
        category?: LabelTemplate['category'];
        tags?: string[];
        supportedSize?: string;
        search?: string;
    }
): LabelTemplate[] => {
    let results = [...templates];

    if (filters.category) {
        results = results.filter(t => t.category === filters.category);
    }

    if (filters.tags && filters.tags.length > 0) {
        results = results.filter(t =>
            filters.tags!.some(tag => t.tags.includes(tag))
        );
    }

    if (filters.supportedSize) {
        results = results.filter(t =>
            t.supportedSizes.includes(filters.supportedSize!)
        );
    }

    if (filters.search) {
        const query = filters.search.toLowerCase();
        results = results.filter(t =>
            t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            t.tags.some(tag => tag.toLowerCase().includes(query))
        );
    }

    return results;
};

/**
 * Get templates compatible with filament data
 */
export const getCompatibleTemplates = (
    data: FilamentData,
    allTemplates: LabelTemplate[]
): LabelTemplate[] => {
    // Filter by hygroscopy for warning templates
    if (data.hygroscopy === 'high') {
        return allTemplates.filter(t =>
            t.category === 'custom' ||
            t.tags.includes('maintenance') ||
            t.tags.includes('warning')
        );
    }

    // Default: return all templates
    return allTemplates;
};

/**
 * Create custom template from scratch
 */
export const createCustomTemplate = (
    name: string,
    description: string,
    layout: TemplateLayout,
    supportedSizes: string[]
): LabelTemplate => {
    return {
        id: `custom-${Date.now()}`,
        name,
        description,
        category: 'custom',
        author: 'You',
        layout,
        supportedSizes,
        tags: ['custom', 'user-created'],
        createdAt: Date.now(),
        isFavorite: false
    };
};
