import React from 'react';
import { FilamentData, LABEL_PRESETS, LabelTheme, PrintSettings } from '../types';
import LabelCanvas from './LabelCanvas';

interface LabelThumbnailProps {
    data: FilamentData;
    theme?: LabelTheme;
    size?: number;
}

const LabelThumbnail: React.FC<LabelThumbnailProps> = ({ data, theme = LabelTheme.SWATCH, size = 60 }) => {
    // We render a small LabelCanvas scaled down
    // Default setting for thumbnail
    const settings: PrintSettings = {
        copies: 1, invert: false, includeQr: true, density: 50, theme: theme, marginMm: 1,
        visibleFields: { brand: true, weight: false, notes: false, date: false, source: false }
    };

    return (
        <div style={{ width: size, height: size }} className="rounded-lg overflow-hidden border border-gray-700 bg-white relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <LabelCanvas
                    data={data}
                    settings={settings}
                    widthMm={40} // Standard width for preview
                    heightMm={40} // Square aspect for thumbnail
                    scale={0.5}
                />
            </div>
        </div>
    );
};

export default LabelThumbnail;
