
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
    visibleFields: { brand: true, weight: true, notes: true, date: false, source: false } 
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

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = Math.round(widthMm * MM_TO_PX);
      const height = Math.round(heightMm * MM_TO_PX);
      
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Base Scaling Factor
      const baseSize = Math.min(width, height * 2.5); 
      const s = baseSize / 380; 

      const bg = settings.invert ? 'black' : 'white';
      const fg = settings.invert ? 'white' : 'black';

      // Clear Canvas
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      ctx.textBaseline = 'middle'; 
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // --- MARGINS ---
      const isMicro = height < 142; // approx 18mm height threshold
      const userMargin = settings.marginMm || 1;
      const marginPx = (isMicro ? Math.min(1, userMargin) : userMargin) * MM_TO_PX;
      
      const safeWidth = width - (marginPx * 2);
      const safeHeight = height - (marginPx * 2);
      const startX = marginPx;
      const startY = marginPx;

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
          const minSize = isMicro ? 8 : 12 * s;
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

      const drawIcon = (type: 'nozzle' | 'bed' | 'weight' | 'palette', x: number, y: number, size: number, color: string = fg) => {
          ctx.fillStyle = color;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1, 1.5 * s);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          
          const cx = x + size/2;
          const cy = y + size/2;
          const scale = size / 24;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(scale, scale);

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
          }
          ctx.restore();
      };

      // --- QR GENERATION ---
      const shouldQr = settings.theme === LabelTheme.SWATCH || settings.includeQr;
      let qrImg: HTMLImageElement | null = null;
      if (shouldQr) {
        try {
          const qrData = JSON.stringify(data);
          const url = await QRCode.toDataURL(qrData, { 
             margin: 0, 
             errorCorrectionLevel: 'M',
             width: 400,
             color: { dark: settings.invert ? '#FFFFFF' : '#000000', light: '#00000000' }
          });
          qrImg = new Image();
          qrImg.src = url;
          await new Promise(r => qrImg!.onload = r);
        } catch (e) {}
      }
      
      if (!active) return;

      // --- THEME RENDERERS ---

      const renderSwatch = () => {
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
             const brandW = contentW - weightW - (2*s);
             
             drawTextFit(data.brand.toUpperCase(), contentX, startY, brandW, row1H, 'bold', 20 * s, 'sans-serif', fg, 'left', 'top');
             drawTextFit(data.weight, contentX + brandW + (2*s), startY, weightW, row1H, 'normal', 16 * s, 'sans-serif', fg, 'right', 'top');

             // Row 2: Material Badge
             const badgeY = startY + row1H + (2 * s);
             const badgeH = safeHeight * 0.45;
             const badgeBg = settings.invert ? 'white' : 'black';
             const badgeFg = settings.invert ? 'black' : 'white';
             
             ctx.fillStyle = badgeBg;
             ctx.beginPath();
             ctx.roundRect(contentX, badgeY, contentW, badgeH, 3 * s);
             ctx.fill();

             drawTextFit(data.material, contentX + (2*s), badgeY, contentW - (4*s), badgeH, '900', 45*s, 'sans-serif', badgeFg, 'center', 'middle');

             // Row 3: Color (Left) - Stats (Right)
             const row3Y = badgeY + badgeH + (3*s);
             const row3H = safeHeight - row3Y + startY;
             
             // Prioritize Stats width
             const statsW = contentW * 0.65;
             const colorW = contentW - statsW - (2*s);

             // Color
             drawTextFit(data.colorName, contentX, row3Y, colorW, row3H, 'normal', 16*s, 'sans-serif', fg, 'left', 'middle');
             
             // Stats Icons & Text
             const statsX = contentX + colorW + (2*s);
             const statColW = statsW / 2;
             const iconS = row3H * 0.8;
             
             // Nozzle
             drawIcon('nozzle', statsX, row3Y + (row3H - iconS)/2, iconS, fg);
             drawTextFit(`${data.minTemp}-${data.maxTemp}`, statsX + iconS + (2*s), row3Y, statColW - iconS - (2*s), row3H, 'bold', 16*s, 'monospace', fg, 'left', 'middle');

             // Bed
             const bedX = statsX + statColW;
             drawIcon('bed', bedX, row3Y + (row3H - iconS)/2, iconS, fg);
             drawTextFit(`${data.bedTempMin}-${data.bedTempMax}`, bedX + iconS + (2*s), row3Y, statColW - iconS - (2*s), row3H, 'bold', 16*s, 'monospace', fg, 'left', 'middle');
             return;
          }

          // STANDARD SWATCH
          const headerH = safeHeight * 0.18;
          const weightW = safeWidth * 0.2;
          
          drawTextFit(data.brand.toUpperCase(), startX, startY, safeWidth - weightW, headerH, '900', 55 * s, 'sans-serif', fg, 'left', 'top');
          
          const wIconS = headerH * 0.7;
          drawIcon('weight', startX + safeWidth - weightW, startY, wIconS, fg);
          drawTextFit(data.weight, startX + safeWidth - weightW + wIconS + (5*s), startY, weightW - wIconS - (5*s), headerH, 'bold', 35 * s, 'sans-serif', fg, 'right', 'top');
          
          const dividerY = startY + headerH + (6 * s);
          ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(startX, dividerY); ctx.lineTo(startX + safeWidth, dividerY); ctx.stroke();

          const bodyY = dividerY + (12 * s);
          const bodyH = safeHeight - (bodyY - startY);
          
          let infoX = startX;
          let infoW = safeWidth;
          if (qrImg) {
              const qrSize = Math.min(bodyH, safeWidth * 0.3);
              ctx.drawImage(qrImg, startX, bodyY, qrSize, qrSize);
              infoX = startX + qrSize + (20 * s);
              infoW = safeWidth - qrSize - (20 * s);
          }

          let curY = bodyY;
          const badgeH = bodyH * 0.35;
          const badgeBg = settings.invert ? 'white' : 'black';
          const badgeFg = settings.invert ? 'black' : 'white';

          ctx.fillStyle = badgeBg;
          ctx.beginPath();
          ctx.roundRect(infoX, curY, infoW, badgeH, 8 * s);
          ctx.fill();
          
          drawTextFit(data.material, infoX + (10*s), curY, infoW - (20*s), badgeH, '900', 85 * s, 'sans-serif', badgeFg, 'center', 'middle');
          curY += badgeH + (12 * s);

          const colorH = bodyH * 0.20;
          drawTextFit(data.colorName, infoX + (5*s), curY, infoW, colorH, 'bold', 45 * s, 'sans-serif', fg, 'left', 'top');
          curY += colorH + (8 * s);

          // Footer: Hex (20%) | Nozzle (40%) | Bed (40%)
          const footerH = bodyH - badgeH - colorH - (25*s);
          const footerY = curY;
          const hexW = infoW * 0.20;
          const statW = (infoW - hexW) / 2;
          const iconSize = footerH * 0.8;

          drawTextFit(data.colorHex, infoX + (5*s), footerY, hexW - (10*s), footerH * 0.6, 'normal', 25 * s, 'monospace', fg, 'left', 'middle');

          const nozX = infoX + hexW;
          drawIcon('nozzle', nozX, footerY, iconSize, fg);
          drawTextFit(`${data.minTemp}–${data.maxTemp}`, nozX + iconSize + (5*s), footerY, statW - iconSize - (5*s), footerH, 'bold', 30 * s, 'monospace', fg, 'left', 'middle');

          const bedX = nozX + statW;
          drawIcon('bed', bedX, footerY, iconSize, fg);
          drawTextFit(`${data.bedTempMin}–${data.bedTempMax}`, bedX + iconSize + (5*s), footerY, statW - iconSize - (5*s), footerH, 'bold', 30 * s, 'monospace', fg, 'left', 'middle');
      };

      const renderTechnical = () => {
          if (isMicro) {
             const col1W = safeWidth * 0.22; 
             const col2W = safeWidth * 0.38; 
             const col3W = safeWidth - col1W - col2W;
             
             ctx.lineWidth = 1 * s; 
             ctx.strokeStyle = fg;
             ctx.strokeRect(startX, startY, safeWidth, safeHeight);
             
             drawLine(startX + col1W, startY, startX + col1W, startY + safeHeight, 1);
             drawLine(startX + col1W + col2W, startY, startX + col1W + col2W, startY + safeHeight, 1);

             drawTextFit(data.brand.substring(0,8).toUpperCase(), startX + 2, startY, col1W - 4, safeHeight, 'bold', 18*s, 'monospace', fg, 'center', 'middle');
             
             const splitH = safeHeight / 2;
             drawTextFit(data.material, startX + col1W + 2, startY, col2W - 4, splitH, 'bold', 20*s, 'monospace', fg, 'center', 'middle');
             drawLine(startX + col1W, startY + splitH, startX + col1W + col2W, startY + splitH, 1);
             drawTextFit(data.colorName.substring(0,10).toUpperCase(), startX + col1W + 2, startY + splitH, col2W - 4, safeHeight - splitH, 'normal', 14*s, 'monospace', fg, 'center', 'middle');
             
             drawTextFit(`N:${data.minTemp}-${data.maxTemp}`, startX + col1W + col2W + 2, startY, col3W - 4, splitH, 'bold', 16*s, 'monospace', fg, 'center', 'middle');
             drawLine(startX + col1W + col2W, startY + splitH, startX + safeWidth, startY + splitH, 1);
             drawTextFit(`B:${data.bedTempMin}-${data.bedTempMax}`, startX + col1W + col2W + 2, startY + splitH, col3W - 4, safeHeight - splitH, 'bold', 16*s, 'monospace', fg, 'center', 'middle');
             return;
          }

          // STANDARD TECHNICAL
          drawBox(startX, startY, safeWidth, safeHeight, 2);
          const headerH = safeHeight * 0.22;
          drawLine(startX, startY + headerH, startX + safeWidth, startY + headerH, 1);
          
          const splitX = safeWidth * 0.35;
          drawLine(startX + splitX, startY, startX + splitX, startY + headerH, 1);
          
          drawTextFit(data.brand.toUpperCase(), startX + (5*s), startY, splitX - (10*s), headerH, 'bold', 35*s, 'monospace', fg, 'left', 'middle');
          drawTextFit(data.material, startX + splitX + (10*s), startY, safeWidth - splitX - (20*s), headerH, 'bold', 55*s, 'monospace', fg, 'right', 'middle');

          let curY = startY + headerH;
          let contentW = safeWidth;
          if (qrImg) {
              const qrSize = safeHeight - headerH - (safeHeight * 0.1); 
              const qrX = startX + safeWidth - qrSize;
              const qrY = curY + (safeHeight * 0.05);
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
              drawLine(qrX, curY, qrX, startY + safeHeight, 1);
              contentW = safeWidth - qrSize;
          }

          const rowH = (safeHeight - headerH) / 3;
          
          drawLine(startX, curY + rowH, startX + contentW, curY + rowH, 1);
          drawIcon('palette', startX + (8*s), curY + (rowH*0.2), rowH * 0.6, fg);
          drawTextFit(data.colorName, startX + (40*s), curY, contentW - (50*s), rowH, 'bold', 30*s, 'monospace');
          curY += rowH;

          drawLine(startX, curY + rowH, startX + contentW, curY + rowH, 1);
          const tempW = contentW / 2;
          drawIcon('nozzle', startX + (8*s), curY + (rowH*0.2), rowH * 0.6, fg);
          drawTextFit(`${data.minTemp}–${data.maxTemp}`, startX + (40*s), curY, tempW - (45*s), rowH, 'bold', 28*s, 'monospace');
          drawLine(startX + tempW, curY, startX + tempW, curY + rowH, 1);
          drawIcon('bed', startX + tempW + (8*s), curY + (rowH*0.2), rowH * 0.6, fg);
          drawTextFit(`${data.bedTempMin}–${data.bedTempMax}`, startX + tempW + (40*s), curY, tempW - (45*s), rowH, 'bold', 28*s, 'monospace');
          curY += rowH;

          drawIcon('weight', startX + (8*s), curY + (rowH*0.2), rowH * 0.6, fg);
          drawTextFit(data.weight, startX + (40*s), curY, contentW - (50*s), rowH, 'bold', 30*s, 'monospace');
      };

      const renderBold = () => {
          if (isMicro) {
              const leftW = safeWidth * 0.30;
              ctx.fillStyle = fg; 
              ctx.fillRect(startX, startY, leftW, safeHeight);
              drawTextFit(data.brand.substring(0,8).toUpperCase(), startX + 2, startY, leftW - 4, safeHeight, '900', 24*s, 'sans-serif', bg, 'center', 'middle');
              
              const rightX = startX + leftW + (4*s);
              const rightW = safeWidth - leftW - (4*s);
              
              const matH = safeHeight * 0.55;
              drawTextFit(data.material.toUpperCase(), rightX, startY, rightW, matH, '900', 50*s, 'sans-serif', fg, 'left', 'middle');
              
              const footerH = safeHeight - matH;
              const colorW = rightW * 0.4;
              const tempsW = rightW - colorW;
              
              drawTextFit(data.colorName, rightX, startY + matH, colorW, footerH, 'normal', 16*s, 'sans-serif', fg, 'left', 'middle');
              
              const tempStr = `${data.minTemp}-${data.maxTemp}° / ${data.bedTempMin}-${data.bedTempMax}°`;
              drawTextFit(tempStr, rightX + colorW, startY + matH, tempsW, footerH, 'bold', 16*s, 'sans-serif', fg, 'right', 'middle');
              return;
          }

          // STANDARD BOLD
          const headerH = safeHeight * 0.22;
          ctx.fillStyle = fg; 
          ctx.fillRect(startX, startY, safeWidth, headerH);
          drawTextFit(data.brand.toUpperCase(), startX, startY, safeWidth, headerH, '900', 45*s, 'sans-serif', bg, 'center', 'middle');

          let curY = startY + headerH + (10*s);
          const matH = safeHeight * 0.45;
          drawTextFit(data.material, startX, curY, safeWidth, matH, '900', 140*s, 'sans-serif', fg, 'center', 'middle');
          
          curY += matH;
          const footerH = safeHeight - (curY - startY);
          
          if (qrImg) {
              const qrSize = footerH;
              ctx.drawImage(qrImg, startX + safeWidth - qrSize, curY, qrSize, qrSize);
              const infoW = safeWidth - qrSize - (10*s);
              drawTextFit(data.colorName, startX, curY, infoW, footerH * 0.5, 'bold', 40*s, 'sans-serif', fg, 'left', 'top');
              drawTextFit(`${data.minTemp}-${data.maxTemp}°C B:${data.bedTempMin}-${data.bedTempMax}`, startX, curY + (footerH * 0.6), infoW, footerH * 0.4, 'normal', 25*s, 'sans-serif', fg, 'left', 'top');
          } else {
               drawTextFit(data.colorName, startX, curY, safeWidth, footerH * 0.5, 'bold', 40*s, 'sans-serif', fg, 'center', 'top');
               drawTextFit(`${data.minTemp}-${data.maxTemp}°C B:${data.bedTempMin}-${data.bedTempMax}`, startX, curY + (footerH * 0.6), safeWidth, footerH * 0.4, 'normal', 25*s, 'sans-serif', fg, 'center', 'top');
          }
      };

      const renderModern = () => {
          if (isMicro) {
              const barW = 8 * s;
              ctx.fillStyle = data.colorHex || '#000';
              if (settings.invert) ctx.fillStyle = 'white';
              ctx.fillRect(startX, startY, barW, safeHeight);
              
              const contentX = startX + barW + (6*s);
              const contentW = safeWidth - barW - (6*s);
              
              const rowH = safeHeight / 3;
              drawTextFit(data.brand.toUpperCase(), contentX, startY, contentW, rowH, 'bold', 18*s, 'sans-serif', fg, 'left', 'middle');
              drawTextFit(data.material, contentX, startY + rowH, contentW, rowH * 1.1, '900', 28*s, 'sans-serif', fg, 'left', 'middle');
              drawTextFit(`${data.minTemp}-${data.maxTemp}°C / ${data.bedTempMin}-${data.bedTempMax}°C`, contentX, startY + (rowH*2), contentW, rowH * 0.9, 'normal', 16*s, 'sans-serif', fg, 'left', 'middle');
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
              ctx.drawImage(qrImg, qrX, startY + (safeHeight - qrSize)/2, qrSize, qrSize);
              contentW -= (qrSize + 15*s);
          }

          const rowH = safeHeight / 4;
          let curY = startY;

          drawTextFit(data.brand.toUpperCase(), contentX, curY, contentW, rowH, 'bold', 30*s, 'sans-serif', fg, 'left', 'top');
          curY += rowH;
          drawTextFit(data.material, contentX, curY, contentW, rowH * 1.6, 'normal', 85*s, 'sans-serif', fg, 'left', 'top');
          curY += rowH * 1.6;
          drawTextFit(data.colorName, contentX, curY, contentW, rowH * 0.7, 'normal', 35*s, 'sans-serif', fg, 'left', 'top');
          curY += rowH * 0.8;
          
          const iconSize = rowH * 0.5;
          drawIcon('nozzle', contentX, curY, iconSize, fg);
          drawTextFit(`${data.minTemp}-${data.maxTemp}`, contentX + iconSize + (4*s), curY, contentW * 0.3, rowH * 0.6, 'bold', 25*s, 'monospace', fg, 'left', 'top');
          
          const bedX = contentX + (contentW * 0.4);
          drawIcon('bed', bedX, curY, iconSize, fg);
          drawTextFit(`${data.bedTempMin}-${data.bedTempMax}`, bedX + iconSize + (4*s), curY, contentW * 0.3, rowH * 0.6, 'bold', 25*s, 'monospace', fg, 'left', 'top');
      };

      const renderMaintenance = () => {
         if (isMicro) { renderTechnical(); return; }
         const col1W = safeWidth * 0.65;
         drawTextFit(data.material, startX, startY, col1W, 70*s, '900', 60*s, 'sans-serif', fg, 'left', 'top');
         drawTextFit(data.brand, startX, startY + 65*s, col1W, 40*s, 'normal', 30*s, 'sans-serif', fg, 'left', 'top');
         drawTextFit(data.colorName, startX, startY + 100*s, col1W, 35*s, 'bold', 30*s, 'monospace', fg, 'left', 'top');
         
         const checkX = startX + col1W + (10*s);
         const boxSize = 25 * s;
         const gap = 10 * s;
         let checkY = startY;
         ctx.lineWidth = 2 * s; ctx.strokeStyle = fg;
         ['Dried', 'Calib', 'Empty'].forEach(lbl => {
             ctx.strokeRect(checkX, checkY, boxSize, boxSize);
             drawTextFit(lbl, checkX + boxSize + gap, checkY + (boxSize/2), safeWidth - checkX - boxSize, boxSize, 'normal', 25*s, 'sans-serif', fg, 'left', 'middle');
             checkY += boxSize + 15*s;
         });
      };

      switch (settings.theme) {
          case LabelTheme.SWATCH: renderSwatch(); break;
          case LabelTheme.TECHNICAL: renderTechnical(); break;
          case LabelTheme.BOLD: renderBold(); break;
          case LabelTheme.MODERN: renderModern(); break;
          case LabelTheme.MAINTENANCE: renderMaintenance(); break;
          default: renderModern();
      }

      onCanvasReady(canvas);
    };

    render();
    return () => { active = false; };
  }, [data, settings, widthMm, heightMm, onCanvasReady, scale]);

  return (
    <canvas 
      ref={canvasRef} 
      className="max-w-full h-auto shadow-sm rounded-sm"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }} 
    />
  );
};

export default LabelCanvas;
