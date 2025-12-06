import React, { useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { FilamentData, PrintSettings, LabelTheme } from '../types';

interface LabelCanvasProps {
  data: FilamentData;
  settings?: PrintSettings;
  widthMm: number;
  heightMm: number;
  scale?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const DPI = 203;
const MM_TO_PX = DPI / 25.4;

const LabelCanvas: React.FC<LabelCanvasProps> = ({
  data,
  settings = {
    copies: 1, invert: false, includeQr: false, density: 100, theme: LabelTheme.SWATCH,
    marginMm: 2,
    visibleFields: { brand: true, weight: true, notes: true, date: false, source: false },
    includeRuler: false
  },
  widthMm,
  heightMm,
  scale = 1,
  onCanvasReady
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;

    const render = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (!data) return; // Safety check

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = Math.round(widthMm * MM_TO_PX * scale);
      const height = Math.round(heightMm * MM_TO_PX * scale);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Base Scaling Factor
      const baseSize = Math.min(width, height * 2.5);
      const s = (baseSize / 380) * scale; // Adjust scaling by prop

      const bg = settings.invert ? 'black' : 'white';
      const fg = settings.invert ? 'white' : 'black';

      // Clear Canvas
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // --- MARGINS ---
      const isNano = height < (80 * scale);
      const isMicro = height < (142 * scale);
      const userMargin = settings.marginMm || 1;

      let marginPx = userMargin * MM_TO_PX * scale;
      if (isNano) marginPx = 2 * scale;
      else if (isMicro) marginPx = Math.min(1, userMargin) * MM_TO_PX * scale;

      const safeWidth = width - (marginPx * 2);
      const safeHeight = height - (marginPx * 2);
      const startX = marginPx;
      const startY = marginPx;

      // Safely access data properties
      const brand = (data.brand || '').toUpperCase();
      const material = (data.material || '').toUpperCase();
      const colorName = data.colorName || '';
      const weight = data.weight || '';
      const minTemp = data.minTemp || 0;
      const maxTemp = data.maxTemp || 0;
      const bedTempMin = data.bedTempMin || 0;
      const bedTempMax = data.bedTempMax || 0;

      // --- HELPERS ---

      const drawTextFit = (
        text: string,
        x: number,
        y: number,
        w: number,
        h: number,
        weight: string,
        maxSize: number,
        family: string = 'sans-serif',
        color: string = fg,
        align: CanvasTextAlign = 'left',
        baseline: CanvasTextBaseline = 'middle'
      ) => {
        if (!text || w <= 0 || h <= 0) return 0;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;

        let size = maxSize;
        ctx.font = `${weight} ${size}px ${family}`;

        const measure = ctx.measureText(text);
        // Scale down width if needed
        if (measure.width > w) {
          size = size * (w / measure.width);
        }

        // Constrain by height
        if (size > h * 0.90) size = h * 0.90;

        // Min size constraint
        const minSize = isNano ? 6 * scale : (isMicro ? 8 * scale : 12 * s);
        size = Math.max(size, minSize);

        ctx.font = `${weight} ${size}px ${family}`;

        let drawX = x;
        if (align === 'center') drawX = x + (w / 2);
        if (align === 'right') drawX = x + w;

        let drawY = y;
        if (baseline === 'middle') drawY = y + (h / 2);
        if (baseline === 'top') drawY = y;
        if (baseline === 'bottom') drawY = y + h;

        ctx.fillText(text, drawX, drawY);
        return size;
      };

      const drawBox = (x: number, y: number, w: number, h: number, stroke = 2) => {
        ctx.lineWidth = stroke * s;
        ctx.strokeStyle = fg;
        ctx.strokeRect(x, y, w, h);
      };

      const drawLine = (x1: number, y1: number, x2: number, y2: number, stroke = 2) => {
        ctx.lineWidth = stroke * s;
        ctx.strokeStyle = fg;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };

      const drawIcon = (type: 'nozzle' | 'bed' | 'weight' | 'palette' | 'moisture' | 'time', x: number, y: number, size: number, color: string = fg) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const cx = x + size / 2;
        const cy = y + size / 2;
        const scaleFactor = size / 24;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scaleFactor, scaleFactor);

        if (type === 'nozzle') {
          ctx.moveTo(-3, 6); ctx.lineTo(0, 10); ctx.lineTo(3, 6);
          ctx.moveTo(-5, 6); ctx.lineTo(5, 6); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.lineTo(-5, 6);
          ctx.moveTo(-3, 0); ctx.lineTo(-3, -8);
          ctx.moveTo(3, 0); ctx.lineTo(3, -8);
          ctx.moveTo(-4, -2); ctx.lineTo(4, -2);
          ctx.moveTo(-4, -5); ctx.lineTo(4, -5);
          ctx.moveTo(-4, -8); ctx.lineTo(4, -8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-3, 6); ctx.lineTo(0, 10); ctx.lineTo(3, 6); ctx.fill();
        } else if (type === 'bed') {
          ctx.fillRect(-10, 2, 20, 3);
          ctx.fillRect(7, 3, 1, 1);
          ctx.beginPath();
          ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-4, -6, -6, -8);
          ctx.moveTo(0, -2); ctx.quadraticCurveTo(2, -6, 0, -8);
          ctx.moveTo(6, -2); ctx.quadraticCurveTo(8, -6, 6, -8);
          ctx.stroke();
        } else if (type === 'weight') {
          ctx.beginPath();
          ctx.moveTo(-6, 8); ctx.lineTo(6, 8);
          ctx.lineTo(5, -4); ctx.lineTo(-5, -4);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, -7, 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = 'bold 6px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = color;
          ctx.fillText('kg', 0, 3);
        } else if (type === 'palette') {
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(3, -3, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 'moisture') {
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.bezierCurveTo(-6, -4, -10, 2, -10, 6);
          ctx.arc(0, 6, 10, 0, Math.PI, false);
          ctx.bezierCurveTo(10, 2, 6, -4, 0, -10);
          ctx.stroke();
        } else if (type === 'time') {
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.moveTo(0, -7); ctx.lineTo(0, 0); ctx.lineTo(5, 5);
          ctx.stroke();
        }
        ctx.restore();
      };

      // Color utility helpers
      const lightenColor = (hex: string, percent: number): string => {
        if (!hex || !hex.startsWith('#')) return '#888888';
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) + percent));
        const g = Math.min(255, (((num >> 8) & 0x00FF) + percent));
        const b = Math.min(255, ((num & 0x0000FF) + percent));
        return `#${(r * 0x10000 + g * 0x100 + b).toString(16).padStart(6, '0')}`;
      };

      const isLightColor = (hex: string): boolean => {
        if (!hex || !hex.startsWith('#')) return true;
        const num = parseInt(hex.replace('#', ''), 16);
        const r = (num >> 16);
        const g = ((num >> 8) & 0x00FF);
        const b = (num & 0x0000FF);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
        return luminance > 155;
      };

      // Brand & Material Intelligence
      const isPremiumBrand = (brandStr: string): boolean => {
        // Only return true for extremely well known premium brands to avoid clutter
        const premium = ['Polymaker', 'Prusament', 'Bambu', 'Atomic', 'Proto-pasta'];
        return premium.some(p => brandStr.toLowerCase().includes(p.toLowerCase()));
      };

      const getMaterialIcon = (mat: string): string => {
        if (mat.includes('CF') || mat.includes('CARBON')) return '⚙️';
        if (mat.includes('TPU') || mat.includes('FLEX')) return '🔄';
        if (mat.includes('SILK')) return '✨';
        if (mat.includes('WOOD')) return '🌳';
        if (mat.includes('METAL')) return '⚡';
        if (mat.includes('GLOW')) return '💡';
        return '';
      };

      const getHygroscopyWarning = (hygroscopy?: string): { show: boolean; text: string; color: string } => {
        if (hygroscopy === 'high') return { show: true, text: '⚠️ KEEP DRY', color: '#FF4444' };
        if (hygroscopy === 'medium') return { show: true, text: '💧 SENSITIVE', color: '#FF8800' };
        return { show: false, text: '', color: '' };
      };

      // --- QR GENERATION ---
      const shouldQr = settings.theme === LabelTheme.SWATCH || settings.includeQr;
      let qrImg: HTMLImageElement | null = null;
      if (shouldQr) {
        try {
          // Use custom QR code if provided, otherwise default format
          const qrData = data.customQrCode || `${brand}|${material}|${minTemp}-${maxTemp}`;
          const url = await QRCode.toDataURL(qrData, {
            margin: 0,
            errorCorrectionLevel: 'M',
            width: 400,
            color: { dark: settings.invert ? '#FFFFFF' : '#000000', light: '#00000000' }
          });
          qrImg = new Image();
          qrImg.src = url;
          await new Promise(r => qrImg!.onload = r);
        } catch (e) { }
      }

      if (!active) return;

      // --- THEME RENDERERS ---

      const renderSwatch = () => {
        if (isNano) {
          // Nano Swatch: Color Block | Material | Temp
          const colorW = safeWidth * 0.15;
          ctx.fillStyle = data.colorHex || '#000';
          ctx.fillRect(startX, startY, colorW, safeHeight);

          const contentX = startX + colorW + (4 * s);
          const contentW = safeWidth - colorW - (4 * s);

          drawTextFit(material, contentX, startY, contentW * 0.6, safeHeight, '900', 30 * s, 'sans-serif', fg, 'left', 'middle');
          drawTextFit(`${minTemp}-${maxTemp}°`, contentX + (contentW * 0.6), startY, contentW * 0.4, safeHeight, 'bold', 20 * s, 'monospace', fg, 'right', 'middle');
          return;
        }

        if (isMicro) {
          let contentX = startX;
          let contentW = safeWidth;

          if (qrImg) {
            const qrSize = safeHeight;
            ctx.drawImage(qrImg, startX, startY, qrSize, qrSize);
            contentX += qrSize + (4 * s);
            contentW -= (qrSize + 4 * s);
          }

          // Row 1: Brand (Left) - Weight (Right)
          const row1H = safeHeight * 0.25;
          const weightW = contentW * 0.30;
          const brandW = contentW - weightW - (2 * s);

          drawTextFit(brand, contentX, startY, brandW, row1H, 'bold', 20 * s, 'sans-serif', fg, 'left', 'top');
          drawTextFit(weight, contentX + brandW + (2 * s), startY, weightW, row1H, 'normal', 16 * s, 'sans-serif', fg, 'right', 'top');

          // Row 2: Material Badge
          const badgeY = startY + row1H + (2 * s);
          const badgeH = safeHeight * 0.45;
          const badgeBg = settings.invert ? 'white' : 'black';
          const badgeFg = settings.invert ? 'black' : 'white';

          ctx.fillStyle = badgeBg;
          ctx.beginPath();
          ctx.roundRect(contentX, badgeY, contentW, badgeH, 3 * s);
          ctx.fill();

          drawTextFit(material, contentX + (2 * s), badgeY, contentW - (4 * s), badgeH, '900', 45 * s, 'sans-serif', badgeFg, 'center', 'middle');

          // Row 3: Color (Left) - Stats (Right)
          const row3Y = badgeY + badgeH + (3 * s);
          const row3H = safeHeight - row3Y + startY;

          // Prioritize Stats width
          const statsW = contentW * 0.65;
          const colorW = contentW - statsW - (2 * s);

          // Color
          drawTextFit(colorName, contentX, row3Y, colorW, row3H, 'normal', 16 * s, 'sans-serif', fg, 'left', 'middle');

          // Stats Icons & Text
          const statsX = contentX + colorW + (2 * s);
          // Give Nozzle more space (approx 55%) vs Bed (45%)
          const nozzleW = statsW * 0.55;
          const bedW = statsW * 0.45;
          const iconS = row3H * 0.7; // Reduce icon size slightly

          // Nozzle
          drawIcon('nozzle', statsX, row3Y + (row3H - iconS) / 2, iconS, fg);
          drawTextFit(`${minTemp}-${maxTemp}`, statsX + iconS + (1 * s), row3Y, nozzleW - iconS - (1 * s), row3H, 'bold', 16 * s, 'monospace', fg, 'left', 'middle');

          // Bed
          const bedX = statsX + nozzleW;
          drawIcon('bed', bedX, row3Y + (row3H - iconS) / 2, iconS, fg);
          drawTextFit(`${bedTempMin}-${bedTempMax}`, bedX + iconS + (1 * s), row3Y, bedW - iconS - (1 * s), row3H, 'bold', 16 * s, 'monospace', fg, 'left', 'middle');
          return;
        }

        // PREMIUM SWATCH REDESIGN
        const colorSwatchSize = Math.min(safeHeight * 0.85, safeWidth * 0.32);
        const swatchX = startX + safeWidth - colorSwatchSize - (8 * s);
        const swatchY = startY + (safeHeight - colorSwatchSize) / 2;

        // Draw LARGE prominent color swatch with gradient and border
        const gradient = ctx.createRadialGradient(
          swatchX + colorSwatchSize * 0.3,
          swatchY + colorSwatchSize * 0.3,
          colorSwatchSize * 0.1,
          swatchX + colorSwatchSize / 2,
          swatchY + colorSwatchSize / 2,
          colorSwatchSize * 0.7
        );

        // Create beautiful gradient from color
        const hexColor = data.colorHex || '#000000';
        gradient.addColorStop(0, lightenColor(hexColor, 20));
        gradient.addColorStop(1, hexColor);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(swatchX, swatchY, colorSwatchSize, colorSwatchSize, 12 * s);
        ctx.fill();

        // Add subtle shadow/border
        ctx.strokeStyle = settings.invert ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // Hex color label inside swatch
        const isLight = isLightColor(hexColor);
        const swatchTextColor = isLight ? '#000000' : '#FFFFFF';
        ctx.save();
        ctx.shadowColor = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 4;
        drawTextFit(hexColor.toUpperCase(), swatchX, swatchY + colorSwatchSize - (35 * s), colorSwatchSize, 30 * s, 'bold', 24 * s, 'monospace', swatchTextColor, 'center', 'middle');
        ctx.restore();

        // Left content area
        const contentW = safeWidth - colorSwatchSize - (25 * s);

        // Brand badge at top with subtle background
        const brandH = safeHeight * 0.14;
        ctx.fillStyle = settings.invert ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
        ctx.beginPath();
        ctx.roundRect(startX, startY, contentW, brandH, 6 * s);
        ctx.fill();

        // Premium brand indicator
        const premium = isPremiumBrand(brand);
        if (premium && !settings.invert) {
          // Gold accent for premium brands
          const premiumGradient = ctx.createLinearGradient(startX, startY, startX, startY + brandH);
          premiumGradient.addColorStop(0, 'rgba(255,215,0,0.15)');
          premiumGradient.addColorStop(1, 'rgba(255,215,0,0.05)');
          ctx.fillStyle = premiumGradient;
          ctx.fill();

          // Premium badge
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(startX + (10 * s), startY + brandH / 2, 4 * s, 0, Math.PI * 2);
          ctx.fill();
        }

        const brandTextX = premium ? startX + (20 * s) : startX + (12 * s);
        drawTextFit(brand, brandTextX, startY, contentW - (brandTextX - startX) - (12 * s), brandH, 'bold', 28 * s, 'sans-serif', fg, 'left', 'middle');

        // Weight badge - top right (OR DATE if enabled)
        const weightBadgeW = 80 * s;
        ctx.fillStyle = settings.invert ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
        ctx.beginPath();
        ctx.roundRect(startX + contentW - weightBadgeW, startY, weightBadgeW, brandH, 6 * s);
        ctx.fill();

        if (settings.visibleFields.date && data.openDate) {
           // SHOW DATE INSTEAD OF WEIGHT
           const dateStr = new Date(data.openDate).toLocaleDateString(undefined, { month: 'numeric', year: '2-digit' });
           drawIcon('time', startX + contentW - weightBadgeW + (8 * s), startY + (brandH - (brandH * 0.5)) / 2, brandH * 0.5, fg);
           drawTextFit(dateStr, startX + contentW - weightBadgeW + (brandH * 0.5) + (12 * s), startY, weightBadgeW - (brandH * 0.5) - (20 * s), brandH, 'bold', 20 * s, 'monospace', fg, 'right', 'middle');
        } else {
           // SHOW WEIGHT
           const wIconS = brandH * 0.5;
           drawIcon('weight', startX + contentW - weightBadgeW + (8 * s), startY + (brandH - wIconS) / 2, wIconS, fg);
           drawTextFit(weight, startX + contentW - weightBadgeW + wIconS + (12 * s), startY, weightBadgeW - wIconS - (20 * s), brandH, 'bold', 22 * s, 'sans-serif', fg, 'right', 'middle');
        }

        // MATERIAL - Large and prominent with specialty icon
        const matY = startY + brandH + (15 * s);
        const matH = safeHeight * 0.42;
        const materialIcon = getMaterialIcon(material);
        const materialText = materialIcon ? `${materialIcon} ${material}` : material;
        drawTextFit(materialText, startX + (5 * s), matY, contentW - (10 * s), matH, '900', 120 * s, 'sans-serif', fg, 'left', 'middle');

        // Hygroscopy warning badge if needed
        const warning = getHygroscopyWarning(data.hygroscopy);
        if (warning.show) {
          const warnH = matH * 0.25;
          const warnY = matY + matH - warnH - (5 * s);
          ctx.fillStyle = warning.color;
          ctx.beginPath();
          ctx.roundRect(startX + (5 * s), warnY, contentW * 0.5, warnH, 4 * s);
          ctx.fill();
          drawTextFit(warning.text, startX + (10 * s), warnY, contentW * 0.5 - (10 * s), warnH, 'bold', 18 * s, 'sans-serif', '#FFFFFF', 'left', 'middle');
        }

        // Color name with icon
        const colorY = matY + matH + (8 * s);
        const colorH = safeHeight * 0.16;
        const paletteSize = colorH * 0.7;
        drawIcon('palette', startX + (8 * s), colorY + (colorH - paletteSize) / 2, paletteSize, fg);
        drawTextFit(colorName, startX + paletteSize + (18 * s), colorY, contentW - paletteSize - (25 * s), colorH, 'bold', 38 * s, 'sans-serif', fg, 'left', 'middle');

        // Temperature bars at bottom with modern design
        const tempY = colorY + colorH + (10 * s);
        const tempH = safeHeight - (tempY - startY);
        const tempBarH = tempH * 0.45;

        // Nozzle temp bar
        ctx.fillStyle = settings.invert ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
        ctx.beginPath();
        ctx.roundRect(startX, tempY, contentW, tempBarH, 6 * s);
        ctx.fill();

        const nozzleIconSize = tempBarH * 0.65;
        drawIcon('nozzle', startX + (10 * s), tempY + (tempBarH - nozzleIconSize) / 2, nozzleIconSize, fg);
        drawTextFit(`${minTemp}°–${maxTemp}°C`, startX + nozzleIconSize + (20 * s), tempY, contentW - nozzleIconSize - (30 * s), tempBarH, 'bold', 32 * s, 'monospace', fg, 'left', 'middle');

        // Bed temp bar
        const bedY = tempY + tempBarH + (6 * s);
        ctx.fillStyle = settings.invert ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
        ctx.beginPath();
        ctx.roundRect(startX, bedY, contentW, tempBarH, 6 * s);
        ctx.fill();

        const bedIconSize = tempBarH * 0.65;
        drawIcon('bed', startX + (10 * s), bedY + (tempBarH - bedIconSize) / 2, bedIconSize, fg);
        drawTextFit(`${bedTempMin}°–${bedTempMax}°C`, startX + bedIconSize + (20 * s), bedY, contentW - bedIconSize - (30 * s), tempBarH, 'bold', 32 * s, 'monospace', fg, 'left', 'middle');
      };

      const renderTechnical = () => {
        if (isNano) {
          // Nano Technical: Brand | Material | Specs
          const col1W = safeWidth * 0.25;
          const col2W = safeWidth * 0.40;
          const col3W = safeWidth - col1W - col2W;

          ctx.lineWidth = 1 * s;
          ctx.strokeStyle = fg;
          ctx.strokeRect(startX, startY, safeWidth, safeHeight);

          drawLine(startX + col1W, startY, startX + col1W, startY + safeHeight, 1);
          drawLine(startX + col1W + col2W, startY, startX + col1W + col2W, startY + safeHeight, 1);

          drawTextFit(brand.substring(0, 4), startX, startY, col1W, safeHeight, 'bold', 18 * s, 'monospace', fg, 'center', 'middle');
          drawTextFit(material, startX + col1W, startY, col2W, safeHeight, 'bold', 20 * s, 'monospace', fg, 'center', 'middle');
          drawTextFit(`${minTemp}-${maxTemp}`, startX + col1W + col2W, startY, col3W, safeHeight, 'normal', 16 * s, 'monospace', fg, 'center', 'middle');
          return;
        }

        if (isMicro) {
          // ... existing micro logic ...
          const col1W = safeWidth * 0.22;
          const col2W = safeWidth * 0.38;
          const col3W = safeWidth - col1W - col2W;

          ctx.lineWidth = 1 * s;
          ctx.strokeStyle = fg;
          ctx.strokeRect(startX, startY, safeWidth, safeHeight);

          drawLine(startX + col1W, startY, startX + col1W, startY + safeHeight, 1);
          drawLine(startX + col1W + col2W, startY, startX + col1W + col2W, startY + safeHeight, 1);

          drawTextFit(brand.substring(0, 8), startX + 2, startY, col1W - 4, safeHeight, 'bold', 18 * s, 'monospace', fg, 'center', 'middle');

          const splitH = safeHeight / 2;
          drawTextFit(material, startX + col1W + 2, startY, col2W - 4, splitH, 'bold', 20 * s, 'monospace', fg, 'center', 'middle');
          drawLine(startX + col1W, startY + splitH, startX + col1W + col2W, startY + splitH, 1);
          drawTextFit(colorName.substring(0, 10).toUpperCase(), startX + col1W + 2, startY + splitH, col2W - 4, safeHeight - splitH, 'normal', 14 * s, 'monospace', fg, 'center', 'middle');

          drawTextFit(`N:${minTemp}-${maxTemp}`, startX + col1W + col2W + 2, startY, col3W - 4, splitH, 'bold', 16 * s, 'monospace', fg, 'center', 'middle');
          drawLine(startX + col1W + col2W, startY + splitH, startX + safeWidth, startY + splitH, 1);
          drawTextFit(`B:${bedTempMin}-${bedTempMax}`, startX + col1W + col2W + 2, startY + splitH, col3W - 4, safeHeight - splitH, 'bold', 16 * s, 'monospace', fg, 'center', 'middle');
          return;
        }

        // ENHANCED TECHNICAL - Engineering Data Sheet Look
        drawBox(startX, startY, safeWidth, safeHeight, 3);

        // Header: Brand | Material
        const headerH = safeHeight * 0.20;
        drawLine(startX, startY + headerH, startX + safeWidth, startY + headerH, 2);

        const splitX = safeWidth * 0.40;
        drawLine(startX + splitX, startY, startX + splitX, startY + headerH, 2);

        drawTextFit(brand, startX + (8 * s), startY, splitX - (16 * s), headerH, 'bold', 40 * s, 'monospace', fg, 'left', 'middle');
        drawTextFit(material, startX + splitX + (10 * s), startY, safeWidth - splitX - (20 * s), headerH, '900', 60 * s, 'monospace', fg, 'right', 'middle');

        // Main Content Grid
        let curY = startY + headerH;
        let contentW = safeWidth;

        if (qrImg) {
          const qrSize = safeHeight - headerH - (safeHeight * 0.1);
          const qrX = startX + safeWidth - qrSize;
          const qrY = curY + (safeHeight * 0.05);
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          drawLine(qrX, curY, qrX, startY + safeHeight, 2);
          contentW = safeWidth - qrSize;
        }

        const rowH = (safeHeight - headerH) / 4;

        // Row 1: Color
        drawLine(startX, curY + rowH, startX + contentW, curY + rowH, 1);
        drawIcon('palette', startX + (8 * s), curY + (rowH * 0.2), rowH * 0.6, fg);
        drawTextFit(colorName, startX + (40 * s), curY, contentW - (50 * s), rowH, 'bold', 30 * s, 'monospace');
        curY += rowH;

        // Row 2: Nozzle Temp
        drawLine(startX, curY + rowH, startX + contentW, curY + rowH, 1);
        drawIcon('nozzle', startX + (8 * s), curY + (rowH * 0.2), rowH * 0.6, fg);
        drawTextFit(`NOZZLE: ${minTemp} - ${maxTemp}°C`, startX + (40 * s), curY, contentW - (50 * s), rowH, 'bold', 28 * s, 'monospace');
        curY += rowH;

        // Row 3: Bed Temp
        drawLine(startX, curY + rowH, startX + contentW, curY + rowH, 1);
        drawIcon('bed', startX + (8 * s), curY + (rowH * 0.2), rowH * 0.6, fg);
        drawTextFit(`BED:    ${bedTempMin} - ${bedTempMax}°C`, startX + (40 * s), curY, contentW - (50 * s), rowH, 'bold', 28 * s, 'monospace');
        curY += rowH;

        // Row 4: Weight & Hygroscopy
        drawIcon('weight', startX + (8 * s), curY + (rowH * 0.2), rowH * 0.6, fg);
        drawTextFit(weight, startX + (40 * s), curY, (contentW / 2) - (50 * s), rowH, 'bold', 30 * s, 'monospace');

        if (data.hygroscopy === 'high' || data.hygroscopy === 'medium') {
          const warnX = startX + (contentW / 2);
          drawIcon('moisture', warnX, curY + (rowH * 0.2), rowH * 0.6, fg);
          drawTextFit('DRY!', warnX + (30 * s), curY, (contentW / 2) - (40 * s), rowH, 'bold', 30 * s, 'monospace', fg);
        }
      };

      const renderMaintenance = () => {
        if (isNano) {
          // Nano Maintenance: Simple Check
          const boxS = safeHeight * 0.8;
          ctx.strokeStyle = fg;
          ctx.lineWidth = 1 * s;
          ctx.strokeRect(startX, startY + (safeHeight - boxS) / 2, boxS, boxS);
          drawTextFit("Dried", startX + boxS + (4 * s), startY, safeWidth - boxS - (4 * s), safeHeight, 'normal', 20 * s, 'sans-serif', fg, 'left', 'middle');
          return;
        }

        if (isMicro) { renderTechnical(); return; }

        // Header
        const headerH = safeHeight * 0.25;
        ctx.fillStyle = settings.invert ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(startX, startY, safeWidth, headerH);

        drawTextFit(material, startX + (5 * s), startY, safeWidth * 0.6, headerH, '900', 60 * s, 'sans-serif', fg, 'left', 'middle');
        drawTextFit(brand, startX + (safeWidth * 0.6), startY, safeWidth * 0.4 - (5 * s), headerH, 'normal', 30 * s, 'sans-serif', fg, 'right', 'middle');

        // Warning Banner if Hygroscopic
        let curY = startY + headerH + (5 * s);
        const warning = getHygroscopyWarning(data.hygroscopy);

        if (warning.show) {
          const warnH = safeHeight * 0.15;
          ctx.fillStyle = warning.color;
          ctx.beginPath();
          ctx.roundRect(startX, curY, safeWidth, warnH, 4 * s);
          ctx.fill();

          drawIcon('moisture', startX + (5 * s), curY + (warnH * 0.1), warnH * 0.8, 'white');
          drawTextFit(warning.text, startX + warnH + (10 * s), curY, safeWidth - warnH - (15 * s), warnH, 'bold', 30 * s, 'sans-serif', 'white', 'center', 'middle');
          curY += warnH + (10 * s);
        } else {
          curY += (10 * s);
        }

        // Checklist
        const checkW = safeWidth * 0.5;
        const boxSize = 30 * s;
        const gap = 15 * s;

        ctx.lineWidth = 2 * s;
        ctx.strokeStyle = fg;

        const items = [
          { l: 'Dried', i: 'moisture' },
          { l: 'Calibrated', i: 'nozzle' },
          { l: 'Opened: ___', i: 'time' }
        ];

        items.forEach(item => {
          ctx.strokeRect(startX, curY, boxSize, boxSize);
          drawTextFit(item.l, startX + boxSize + gap, curY + (boxSize / 2), safeWidth - boxSize - gap, boxSize, 'normal', 28 * s, 'sans-serif', fg, 'left', 'middle');
          curY += boxSize + (12 * s);
        });

        // Bottom info
        const footerH = safeHeight - (curY - startY);
        if (footerH > 20 * s) {
          drawTextFit(`${colorName} • ${weight}`, startX, curY, safeWidth, footerH, 'normal', 20 * s, 'monospace', fg, 'center', 'bottom');
        }
      };

      const renderBold = () => {
        if (isNano) {
          // Nano Bold: Brand (Small) | Material (Large)
          const brandW = safeWidth * 0.3;
          ctx.fillStyle = fg;
          ctx.fillRect(startX, startY, brandW, safeHeight);
          drawTextFit(brand.substring(0, 4), startX, startY, brandW, safeHeight, '900', 18 * s, 'sans-serif', bg, 'center', 'middle');

          drawTextFit(material, startX + brandW + (4 * s), startY, safeWidth - brandW - (4 * s), safeHeight, '900', 35 * s, 'sans-serif', fg, 'center', 'middle');
          return;
        }

        if (isMicro) {
          const leftW = safeWidth * 0.30;
          ctx.fillStyle = fg;
          ctx.fillRect(startX, startY, leftW, safeHeight);
          drawTextFit(brand.substring(0, 8), startX + 2, startY, leftW - 4, safeHeight, '900', 24 * s, 'sans-serif', bg, 'center', 'middle');

          const rightX = startX + leftW + (4 * s);
          const rightW = safeWidth - leftW - (4 * s);

          const matH = safeHeight * 0.55;
          drawTextFit(material, rightX, startY, rightW, matH, '900', 50 * s, 'sans-serif', fg, 'left', 'middle');

          const footerH = safeHeight - matH;
          const colorW = rightW * 0.4;
          const tempsW = rightW - colorW;

          drawTextFit(colorName, rightX, startY + matH, colorW, footerH, 'normal', 16 * s, 'sans-serif', fg, 'left', 'middle');

          const tempStr = `${minTemp}-${maxTemp}° / ${bedTempMin}-${bedTempMax}°`;
          drawTextFit(tempStr, rightX + colorW, startY + matH, tempsW, footerH, 'bold', 16 * s, 'sans-serif', fg, 'right', 'middle');
          return;
        }

        // STANDARD BOLD
        const headerH = safeHeight * 0.22;
        ctx.fillStyle = fg;
        ctx.fillRect(startX, startY, safeWidth, headerH);
        drawTextFit(brand, startX, startY, safeWidth, headerH, '900', 45 * s, 'sans-serif', bg, 'center', 'middle');

        let curY = startY + headerH + (10 * s);
        const matH = safeHeight * 0.45;
        drawTextFit(material, startX, curY, safeWidth, matH, '900', 140 * s, 'sans-serif', fg, 'center', 'middle');

        curY += matH;
        const footerH = safeHeight - (curY - startY);

        if (qrImg) {
          const qrSize = footerH;
          ctx.drawImage(qrImg, startX + safeWidth - qrSize, curY, qrSize, qrSize);
          const infoW = safeWidth - qrSize - (10 * s);
          drawTextFit(colorName, startX, curY, infoW, footerH * 0.5, 'bold', 40 * s, 'sans-serif', fg, 'left', 'top');
          drawTextFit(`${minTemp}-${maxTemp}°C B:${bedTempMin}-${bedTempMax}`, startX, curY + (footerH * 0.6), infoW, footerH * 0.4, 'normal', 25 * s, 'sans-serif', fg, 'left', 'top');
        } else {
          drawTextFit(colorName, startX, curY, safeWidth, footerH * 0.5, 'bold', 40 * s, 'sans-serif', fg, 'center', 'top');
          drawTextFit(`${minTemp}-${maxTemp}°C B:${bedTempMin}-${bedTempMax}`, startX, curY + (footerH * 0.6), safeWidth, footerH * 0.4, 'normal', 25 * s, 'sans-serif', fg, 'center', 'top');
        }
      };

      const renderModern = () => {
        if (isNano) {
          // Nano Modern: Minimalist Bar | Material
          const barW = 6 * s;
          ctx.fillStyle = data.colorHex || '#000';
          if (settings.invert) ctx.fillStyle = 'white';
          ctx.fillRect(startX, startY, barW, safeHeight);

          drawTextFit(material, startX + barW + (4 * s), startY, safeWidth - barW - (4 * s), safeHeight, '900', 32 * s, 'sans-serif', fg, 'left', 'middle');
          return;
        }

        if (isMicro) {
          const barW = 8 * s;
          ctx.fillStyle = data.colorHex || '#000';
          if (settings.invert) ctx.fillStyle = 'white';
          ctx.fillRect(startX, startY, barW, safeHeight);

          const contentX = startX + barW + (6 * s);
          const contentW = safeWidth - barW - (6 * s);

          const rowH = safeHeight / 3;
          drawTextFit(brand, contentX, startY, contentW, rowH, 'bold', 18 * s, 'sans-serif', fg, 'left', 'middle');
          drawTextFit(material, contentX, startY + rowH, contentW, rowH * 1.1, '900', 28 * s, 'sans-serif', fg, 'left', 'middle');
          drawTextFit(`${minTemp}-${maxTemp}°C / ${bedTempMin}-${bedTempMax}°C`, contentX, startY + (rowH * 2), contentW, rowH * 0.9, 'normal', 16 * s, 'sans-serif', fg, 'left', 'middle');
          return;
        }

        // STANDARD MODERN
        let contentX = startX;
        let contentW = safeWidth;

        const barW = 10 * s;
        ctx.fillStyle = data.colorHex || '#000';
        ctx.fillRect(contentX, startY, barW, safeHeight);
        if (settings.invert) { ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.strokeRect(contentX, startY, barW, safeHeight); }

        contentX += barW + (15 * s);
        contentW -= (barW + 15 * s);

        if (qrImg) {
          const qrSize = Math.min(safeHeight, contentW * 0.35);
          const qrX = startX + safeWidth - qrSize;
          ctx.drawImage(qrImg, qrX, startY + (safeHeight - qrSize) / 2, qrSize, qrSize);
          contentW -= (qrSize + 15 * s);
        }

        const rowH = safeHeight / 4;
        let curY = startY;

        drawTextFit(brand, contentX, curY, contentW, rowH, 'bold', 30 * s, 'sans-serif', fg, 'left', 'top');
        curY += rowH;
        drawTextFit(material, contentX, curY, contentW, rowH * 1.6, 'normal', 85 * s, 'sans-serif', fg, 'left', 'top');
        curY += rowH * 1.6;
        drawTextFit(colorName, contentX, curY, contentW, rowH * 0.7, 'normal', 35 * s, 'sans-serif', fg, 'left', 'top');
        curY += rowH * 0.8;

        const iconSize = rowH * 0.5;
        drawIcon('nozzle', contentX, curY, iconSize, fg);
        drawTextFit(`${minTemp}-${maxTemp}`, contentX + iconSize + (4 * s), curY, contentW * 0.3, rowH * 0.6, 'bold', 25 * s, 'monospace', fg, 'left', 'top');

        const bedX = contentX + (contentW * 0.4);
        drawIcon('bed', bedX, curY, iconSize, fg);
        drawTextFit(`${bedTempMin}-${bedTempMax}`, bedX + iconSize + (4 * s), curY, contentW * 0.3, rowH * 0.6, 'bold', 25 * s, 'monospace', fg, 'left', 'top');
      };

      const renderMinimal = () => {
        // Ultra-clean minimal design - just the essentials
        if (isNano) {
          drawTextFit(material, startX, startY, safeWidth, safeHeight, '900', 35 * s, 'sans-serif', fg, 'center', 'middle');
          return;
        }

        if (isMicro) {
          // For micro labels: Material | Temps
          const col1W = safeWidth * 0.55;
          drawTextFit(material, startX, startY, col1W, safeHeight, '900', 32 * s, 'sans-serif', fg, 'left', 'middle');
          drawTextFit(`${minTemp}-${maxTemp}°`, startX + col1W, startY, safeWidth - col1W, safeHeight, 'bold', 18 * s, 'monospace', fg, 'right', 'middle');
          return;
        }

        // Standard minimal layout
        const headerH = safeHeight * 0.15;
        const mainH = safeHeight * 0.50;
        const footerH = safeHeight * 0.35;

        // Subtle top line
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(startX, startY + headerH);
        ctx.lineTo(startX + safeWidth, startY + headerH);
        ctx.stroke();

        // Brand - small at top
        drawTextFit(brand, startX, startY, safeWidth, headerH, 'normal', 22 * s, 'sans-serif', fg, 'left', 'middle');

        // Material - Large and centered
        drawTextFit(material, startX, startY + headerH, safeWidth, mainH, '900', 100 * s, 'sans-serif', fg, 'center', 'middle');

        // Footer info
        const footerY = startY + headerH + mainH;

        // Subtle bottom line
        ctx.beginPath();
        ctx.moveTo(startX, footerY);
        ctx.lineTo(startX + safeWidth, footerY);
        ctx.stroke();

        // Color | Temps side by side
        const halfW = safeWidth / 2;
        drawTextFit(colorName, startX, footerY, halfW - (10 * s), footerH, 'normal', 28 * s, 'sans-serif', fg, 'left', 'middle');
        drawTextFit(`${minTemp}–${maxTemp}°C`, startX + halfW, footerY, halfW, footerH, 'bold', 28 * s, 'monospace', fg, 'right', 'middle');
      };

      switch (settings.theme) {
        case LabelTheme.SWATCH: renderSwatch(); break;
        case LabelTheme.TECHNICAL: renderTechnical(); break;
        case LabelTheme.BOLD: renderBold(); break;
        case LabelTheme.MODERN: renderModern(); break;
        case LabelTheme.MAINTENANCE: renderMaintenance(); break;
        case LabelTheme.MINIMAL: renderMinimal(); break;
        default: renderModern();
      }

      // --- RULER OVERLAY ---
      if (settings.includeRuler) {
          const rulerX = width - (2 * MM_TO_PX); // 2mm from right
          ctx.beginPath();
          ctx.strokeStyle = fg;
          ctx.lineWidth = 1 * s;
          ctx.moveTo(rulerX, 0);
          ctx.lineTo(rulerX, height);
          ctx.stroke();

          // Draw ticks
          for (let i = 0; i <= heightMm; i++) {
              const y = i * MM_TO_PX;
              // Skip 0 and end to avoid clutter
              if (y < 2 || y > height - 2) continue;

              const isCm = i % 10 === 0;
              const len = isCm ? (6 * s) : (3 * s); // Tick length

              ctx.beginPath();
              ctx.moveTo(rulerX, y);
              ctx.lineTo(rulerX - len, y);
              ctx.stroke();

              if (isCm && i > 0 && i < heightMm) {
                  // Draw text slightly offset
                  ctx.font = `${8 * s}px sans-serif`;
                  ctx.textAlign = 'right';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = fg;
                  ctx.fillText(i.toString(), rulerX - len - (2 * s), y);
              }
          }
      }

      if (onCanvasReady) {
        onCanvasReady(canvas);
      }
    };

    render();
    return () => { active = false; };
  }, [data, settings, widthMm, heightMm, onCanvasReady, scale]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto shadow-sm rounded-sm"
    />
  );
};

export default LabelCanvas;
