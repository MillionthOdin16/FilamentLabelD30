import { FilamentData, PrintSettings, PrinterInfo, CalibrationData } from '../types';

// Persistent Connection State
let cachedDevice: BluetoothDevice | null = null;
let connectionListeners: ((isConnected: boolean) => void)[] = [];
let statusListeners: ((status: string) => void)[] = [];

const notifyListeners = (isConnected: boolean) => {
    connectionListeners.forEach(l => l(isConnected));
};

const notifyStatus = (status: string) => {
    statusListeners.forEach(l => l(status));
}

export const addConnectionListener = (listener: (isConnected: boolean) => void) => {
    connectionListeners.push(listener);
    // Notify immediately of current state
    listener(!!cachedDevice && !!cachedDevice.gatt?.connected);
};

export const removeConnectionListener = (listener: (isConnected: boolean) => void) => {
    connectionListeners = connectionListeners.filter(l => l !== listener);
};

export const addStatusListener = (listener: (status: string) => void) => {
    statusListeners.push(listener);
};

export const removeStatusListener = (listener: (status: string) => void) => {
    statusListeners = statusListeners.filter(l => l !== listener);
};

export const getConnectedDevice = (): BluetoothDevice | null => {
    if (cachedDevice && cachedDevice.gatt?.connected) {
        return cachedDevice;
    }
    return null;
};

export const disconnectPrinter = () => {
    if (cachedDevice && cachedDevice.gatt?.connected) {
        cachedDevice.gatt.disconnect();
    }
    cachedDevice = null;
    notifyListeners(false);
};

// Services and Characteristics
const PRINTER_SERVICES = {
    // Phomemo Standard
    PHOMEMO: '000018f0-0000-1000-8000-00805f9b34fb',
    ALT_SERVICE: '0000ff00-0000-1000-8000-00805f9b34fb',
    PROPRIETARY: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2',

    // HM-10 UART (Common in generic/iDPRT S1?)
    HM10_UART: '0000ffe0-0000-1000-8000-00805f9b34fb',

    // Nordic UART (Common in BLE devices)
    NORDIC_UART: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',

    // Standard Info
    BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
    DEVICE_INFO: '0000180a-0000-1000-8000-00805f9b34fb'
};

const WRITE_CHARACTERISTICS = {
    // HM-10
    HM10_TX: '0000ffe1-0000-1000-8000-00805f9b34fb',
    // Nordic
    NORDIC_TX: '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
};

export const connectPrinter = async (): Promise<BluetoothDevice> => {
    if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth is not supported in this browser.");
    }

    // Return cached device if still connected
    if (cachedDevice && cachedDevice.gatt?.connected) {
        return cachedDevice;
    }

    // Clean up old reference if it exists but disconnected
    cachedDevice = null;

    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'M' }, // M110, M02
                { namePrefix: 'D' }, // D30
                { namePrefix: 'Q' }, // Q30
                { namePrefix: 'P' }, // Phomemo
                { namePrefix: 'S' }, // S1 / Generic S-series
                { namePrefix: 'iD' }, // iDPRT
                { services: [PRINTER_SERVICES.HM10_UART] } // Catch HM-10 based devices
            ],
            optionalServices: [
                PRINTER_SERVICES.PHOMEMO,
                PRINTER_SERVICES.ALT_SERVICE,
                PRINTER_SERVICES.PROPRIETARY,
                PRINTER_SERVICES.HM10_UART,
                PRINTER_SERVICES.NORDIC_UART,
                PRINTER_SERVICES.BATTERY,
                PRINTER_SERVICES.DEVICE_INFO
            ]
        });

        // Add disconnect listener
        device.addEventListener('gattserverdisconnected', () => {
            console.log("Printer disconnected");
            cachedDevice = null;
            notifyListeners(false);
        });

        cachedDevice = device;
        notifyListeners(true);
        return device;
    } catch (e) {
        cachedDevice = null;
        notifyListeners(false);
        throw e;
    }
};

export const getDeviceDetails = async (device: BluetoothDevice): Promise<Partial<PrinterInfo>> => {
    const info: Partial<PrinterInfo> = { name: device.name || 'Printer' };
    try {
        if (!device.gatt?.connected) await device.gatt?.connect();
        const server = device.gatt;
        if (!server) return info;

        // Device Information Service
        try {
            const service = await server.getPrimaryService(PRINTER_SERVICES.DEVICE_INFO);

            // Model Number
            try {
                const modelChar = await service.getCharacteristic('00002a24-0000-1000-8000-00805f9b34fb');
                const val = await modelChar.readValue();
                const decoder = new TextDecoder('utf-8');
                info.model = decoder.decode(val);
            } catch (e) { }

            // Firmware Revision
            try {
                const fwChar = await service.getCharacteristic('00002a26-0000-1000-8000-00805f9b34fb');
                const val = await fwChar.readValue();
                const decoder = new TextDecoder('utf-8');
                info.firmware = decoder.decode(val);
            } catch (e) { }

        } catch (e) {
            console.debug("Device Info service not found");
        }

    } catch (e) {
        console.warn("Error fetching device details", e);
    }
    return info;
};

export const getBatteryLevel = async (device: BluetoothDevice): Promise<number | null> => {
    try {
        if (!device.gatt?.connected) await device.gatt?.connect();
        const server = device.gatt;
        if (!server) return null;

        const batteryService = await server.getPrimaryService(PRINTER_SERVICES.BATTERY);
        const batteryLevelChar = await batteryService.getCharacteristic('00002a19-0000-1000-8000-00805f9b34fb');
        const value = await batteryLevelChar.readValue();
        return value.getUint8(0);
    } catch (e) {
        console.warn("Battery service not available", e);
        return null;
    }
};

const getWriteCharacteristic = async (device: BluetoothDevice): Promise<BluetoothRemoteGATTCharacteristic> => {
    if (!device.gatt?.connected) await device.gatt?.connect();
    const server = device.gatt;
    if (!server) throw new Error("GATT Server not found");

    // Order of services to check
    const servicesToCheck = [
        PRINTER_SERVICES.PHOMEMO,
        PRINTER_SERVICES.ALT_SERVICE,
        PRINTER_SERVICES.PROPRIETARY,
        PRINTER_SERVICES.HM10_UART,
        PRINTER_SERVICES.NORDIC_UART
    ];

    // 1. Try known specific Write Characteristics first (Fast Path)
    for (const sUuid of servicesToCheck) {
        try {
            const service = await server.getPrimaryService(sUuid);

            // Check for HM-10 TX specific
            if (sUuid === PRINTER_SERVICES.HM10_UART) {
                try { return await service.getCharacteristic(WRITE_CHARACTERISTICS.HM10_TX); } catch(e) {}
            }

            // Check for Nordic TX specific
            if (sUuid === PRINTER_SERVICES.NORDIC_UART) {
                try { return await service.getCharacteristic(WRITE_CHARACTERISTICS.NORDIC_TX); } catch(e) {}
            }

            // Fallback: Generic enumeration
            const chars = await service.getCharacteristics();
            for (const c of chars) {
                if (c.properties.write || c.properties.writeWithoutResponse) {
                    return c;
                }
            }
        } catch (e) { continue; }
    }
    throw new Error("No writeable characteristic found. Device might be incompatible.");
}

export const feedPaper = async (device: BluetoothDevice) => {
    try {
        const char = await getWriteCharacteristic(device);
        // ESC d n (Print and feed n lines)
        const cmd = new Uint8Array([0x1B, 0x64, 150]);
        await writeValue(char, cmd);
    } catch (e) {
        console.error("Feed failed", e);
        throw e;
    }
};

export const checkPrinterStatus = async (device: BluetoothDevice): Promise<'ready' | 'paper_out' | 'cover_open' | 'unknown'> => {
    if (!device.gatt?.connected) return 'unknown';
    // Most cheap printers don't reliably report status via standard characteristics
    return 'ready';
};

export const printLabel = async (device: BluetoothDevice, canvas: HTMLCanvasElement, settings: PrintSettings) => {
    const status = await checkPrinterStatus(device);
    if (status === 'paper_out') throw new Error("Printer is out of paper");

    const characteristic = await getWriteCharacteristic(device);

    // Apply advanced settings if present
    if (settings.speed) {
        try { await setPrintSpeed(device, settings.speed); } catch (e) { console.warn("Failed to set speed", e); }
    }
    if (settings.labelType) {
        try { await setLabelType(device, settings.labelType); } catch (e) { console.warn("Failed to set label type", e); }
    }

    // --- PREPARE DATA ---
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("No canvas context");

    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;

    // Software Contrast Adjustment
    let grayscale = new Float32Array(width * height);

    for (let i = 0; i < pixels.length / 4; i++) {
        const r = pixels[i * 4];
        const g = pixels[i * 4 + 1];
        const b = pixels[i * 4 + 2];
        const a = pixels[i * 4 + 3];

        if (a < 128) {
            grayscale[i] = 255; // Transparent -> White paper
        } else {
            // Standard Luminance
            let gray = r * 0.299 + g * 0.587 + b * 0.114;

            // Apply Density/Contrast (Enhanced)
            // 50 is neutral. 0 is lightest, 100 is darkest.
            if (settings.density !== 50) {
                 // Convert 0-100 to a contrast factor
                 // 50 -> 1.0 (no change)
                 // 100 -> 2.0 (high contrast/darker)
                 // 0 -> 0.5 (low contrast/lighter)

                 // Simpler approach: Gamma correction or just brightness shift?
                 // Let's stick to brightness shift but amplify it.
                 // range: -128 to +128 shift
                 const shift = (settings.density - 50) * 2.5;
                 gray = gray - shift;

                 if (gray < 0) gray = 0;
                 if (gray > 255) gray = 255;
            }

            grayscale[i] = gray;
        }
    }

    // Base Threshold for dithering - standard is 128
    const baseThreshold = 128;

    // --- OFFSET LOGIC (Software Shift) ---
    const offsetMm = settings.printOffsetMm || 0;
    const offsetPx = Math.round((offsetMm / 25.4) * 203);

    let offsetGrayscale = new Float32Array(width * height);

    if (offsetPx !== 0) {
        console.log(`Applying print offset: ${offsetMm}mm (${offsetPx}px)`);
        // Fill with white (255) initially
        offsetGrayscale.fill(255);

        for (let y = 0; y < height; y++) {
            const targetY = y + offsetPx;
            // Check bounds
            if (targetY >= 0 && targetY < height) {
                for (let x = 0; x < width; x++) {
                    offsetGrayscale[targetY * width + x] = grayscale[y * width + x];
                }
            }
        }
        // Replace original grayscale with shifted version
        grayscale = offsetGrayscale;
    }

    // --- AUTO ROTATION LOGIC ---
    let finalWidth = width;
    let finalHeight = height;
    let finalGrayscale = grayscale;

    if (width > height && height < 180) {
        console.log(`Auto-rotating label (W:${width} > H:${height}) for narrow printhead`);
        const rotatedWidth = height;
        const rotatedHeight = width;
        const rotatedData = new Float32Array(rotatedWidth * rotatedHeight);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Rotate 90 deg Clockwise: (x, y) -> (height - 1 - y, x)
                const srcIdx = y * width + x;
                const destX = height - 1 - y;
                const destY = x;
                const destIdx = destY * rotatedWidth + destX;
                rotatedData[destIdx] = grayscale[srcIdx];
            }
        }
        finalWidth = rotatedWidth;
        finalHeight = rotatedHeight;
        finalGrayscale = rotatedData;
    }

    // --- DITHERING ---
    const monochrome = new Uint8Array(finalWidth * finalHeight);

    for (let y = 0; y < finalHeight; y++) {
        for (let x = 0; x < finalWidth; x++) {
            const idx = y * finalWidth + x;
            const oldPixel = finalGrayscale[idx];
            const newPixel = oldPixel < baseThreshold ? 0 : 255;
            monochrome[idx] = newPixel === 0 ? 1 : 0;

            const quantError = oldPixel - newPixel;

            if (x + 1 < finalWidth) finalGrayscale[idx + 1] += quantError * 7 / 16;
            if (x - 1 >= 0 && y + 1 < finalHeight) finalGrayscale[idx + finalWidth - 1] += quantError * 3 / 16;
            if (y + 1 < finalHeight) finalGrayscale[idx + finalWidth] += quantError * 5 / 16;
            if (x + 1 < finalWidth && y + 1 < finalHeight) finalGrayscale[idx + finalWidth + 1] += quantError * 1 / 16;
        }
    }

    // Pack bits
    const widthBytes = Math.ceil(finalWidth / 8);
    const buffer: number[] = [];

    for (let y = 0; y < finalHeight; y++) {
        for (let x = 0; x < widthBytes; x++) {
            let byte = 0;
            for (let b = 0; b < 8; b++) {
                const px = x * 8 + b;
                if (px < finalWidth) {
                    if (monochrome[y * finalWidth + px] === 1) {
                        byte |= (1 << (7 - b));
                    }
                }
            }
            buffer.push(byte);
        }
    }

    // --- COMMAND GENERATION ---
    const initCmd = new Uint8Array([0x1B, 0x40]);

    // Set Density (Hardware) - Using standard ESC/POS or Phomemo proprietary
    // The "Complete Verification Summary" suggested 0x1F 0x11 0x24 [n]
    // Standard ESC/POS is GS ( E ...
    // We will trust the user provided summary for the experimental support
    const densityByte = Math.max(1, Math.min(15, Math.ceil(settings.density / 100 * 15)));
    const densityCmd = new Uint8Array([0x1F, 0x11, 0x24, densityByte]);

    const xL = widthBytes % 256;
    const xH = Math.floor(widthBytes / 256);
    const yL = finalHeight % 256;
    const yH = Math.floor(finalHeight / 256);

    const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
    const dataPayload = new Uint8Array(buffer);

    for (let i = 0; i < settings.copies; i++) {
        if (settings.copies > 1) notifyStatus(`Printing copy ${i + 1}/${settings.copies}...`);
        else notifyStatus("Sending data to printer...");

        await writeValue(characteristic, initCmd);
        await new Promise(r => setTimeout(r, 50));

        await writeValue(characteristic, densityCmd);
        await new Promise(r => setTimeout(r, 50));

        await writeValue(characteristic, header);

        // Chunk size 60 is standard for BLE MTU limits on these devices
        const CHUNK_SIZE = 60;
        const totalChunks = Math.ceil(dataPayload.length / CHUNK_SIZE);

        for (let j = 0; j < dataPayload.length; j += CHUNK_SIZE) {
            const chunkIndex = Math.floor(j / CHUNK_SIZE);
            if (chunkIndex % 5 === 0) {
                 const percent = Math.round((chunkIndex / totalChunks) * 100);
                 notifyStatus(`Sending data... ${percent}%`);
            }

            const chunk = dataPayload.slice(j, j + CHUNK_SIZE);
            await writeValue(characteristic, chunk);
            await new Promise(r => setTimeout(r, 20));
        }

        notifyStatus("Print command sent!");

        if (i < settings.copies - 1) await new Promise(r => setTimeout(r, 1000));
    }
};

// ===== ADVANCED D30 PRO FEATURES =====

/**
 * Set print speed on D30 (1=slowest, 5=fastest)
 * ESC N 0x0D [speed]
 */
export const setPrintSpeed = async (device: BluetoothDevice, speed: 1 | 2 | 3 | 4 | 5): Promise<void> => {
    try {
        const char = await getWriteCharacteristic(device);
        const cmd = new Uint8Array([0x1B, 0x4E, 0x0D, speed]);
        await writeValue(char, cmd);
        await new Promise(r => setTimeout(r, 50));
    } catch (e) {
        console.error("Speed setting failed", e);
        throw e;
    }
};

/**
 * Set label type on D30
 * ESC N [type]
 * 0x0A = Label with gaps
 * 0x0B = Continuous  
 * 0x26 = Label with black marks
 */
export const setLabelType = async (device: BluetoothDevice, type: 'gap' | 'continuous' | 'mark'): Promise<void> => {
    try {
        const char = await getWriteCharacteristic(device);
        const typeCode = type === 'gap' ? 0x0A : type === 'continuous' ? 0x0B : 0x26;
        const cmd = new Uint8Array([0x1F, 0x11, typeCode]);
        await writeValue(char, cmd);
        await new Promise(r => setTimeout(r, 50));
    } catch (e) {
        console.error("Label type setting failed", e);
        throw e;
    }
};

/**
 * Set text justification
 * ESC a [n]
 * 0 = left, 1 = center, 2 = right
 */
export const setJustification = async (device: BluetoothDevice, align: 'left' | 'center' | 'right'): Promise<void> => {
    try {
        const char = await getWriteCharacteristic(device);
        const alignCode = align === 'left' ? 0 : align === 'center' ? 1 : 2;
        const cmd = new Uint8Array([0x1B, 0x61, alignCode]);
        await writeValue(char, cmd);
        await new Promise(r => setTimeout(r, 50));
    } catch (e) {
        console.error("Justification setting failed", e);
        throw e;
    }
};

/**
 * Send calibration test pattern
 */
export const sendCalibrationPattern = async (device: BluetoothDevice, widthMm: number): Promise<void> => {
    try {
        const char = await getWriteCharacteristic(device);

        // Create test pattern with vertical lines at 5mm intervals
        const dpi = 203;
        const widthPx = Math.floor((widthMm / 25.4) * dpi);
        const heightPx = 100;
        const widthBytes = Math.ceil(widthPx / 8);

        const buffer: number[] = [];
        for (let y = 0; y < heightPx; y++) {
            for (let x = 0; x < widthBytes; x++) {
                let byte = 0;
                // Draw vertical line every 40 pixels (~5mm at 203 DPI)
                for (let b = 0; b < 8; b++) {
                    const px = x * 8 + b;
                    if (px % 40 === 0 || y === 0 || y === heightPx - 1) {
                        byte |= (1 << (7 - b));
                    }
                }
                buffer.push(byte);
            }
        }

        // Send pattern
        const initCmd = new Uint8Array([0x1B, 0x40]);
        await writeValue(char, initCmd);
        await new Promise(r => setTimeout(r, 50));

        const header = new Uint8Array([
            0x1D, 0x76, 0x30, 0x00,
            widthBytes % 256, Math.floor(widthBytes / 256),
            heightPx % 256, Math.floor(heightPx / 256)
        ]);
        await writeValue(char, header);

        const dataPayload = new Uint8Array(buffer);
        const CHUNK_SIZE = 60;
        for (let j = 0; j < dataPayload.length; j += CHUNK_SIZE) {
            const chunk = dataPayload.slice(j, j + CHUNK_SIZE);
            await writeValue(char, chunk);
            await new Promise(r => setTimeout(r, 20));
        }

        const feedCmd = new Uint8Array([0x1B, 0x64, 3]);
        await writeValue(char, feedCmd);
    } catch (e) {
        console.error("Calibration pattern failed", e);
        throw e;
    }
};

const writeValue = async (char: BluetoothRemoteGATTCharacteristic, value: Uint8Array) => {
    if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(value as any);
    } else {
        await char.writeValue(value as any);
    }
};
