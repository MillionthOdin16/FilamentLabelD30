
export interface FilamentData {
  brand: string;
  material: string;
  colorName: string;
  colorHex: string;
  minTemp: number;
  maxTemp: number;
  bedTempMin: number;
  bedTempMax: number;
  weight: string;
  notes: string;
  hygroscopy: 'low' | 'medium' | 'high';
  source?: string; // e.g. "Gemini 2.5 Flash"
  referenceUrl?: string; // e.g. "https://polymaker.com/..."
  confidence?: number; // 0-100
  alternatives?: Array<{ brand: string; material: string; colorName: string }>;
  uuid?: string;
  openDate?: string; // ISO date when spool was opened
  purchaseDate?: string; // ISO date when purchased
  remainingWeight?: string; // e.g. "750g" or "75%"
}

// Common material presets with typical print settings
export interface MaterialPreset {
  id: string;
  material: string;
  minTemp: number;
  maxTemp: number;
  bedTempMin: number;
  bedTempMax: number;
  hygroscopy: 'low' | 'medium' | 'high';
  tips?: string;
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  { id: 'pla', material: 'PLA', minTemp: 190, maxTemp: 220, bedTempMin: 50, bedTempMax: 60, hygroscopy: 'low', tips: 'Easy to print, biodegradable' },
  { id: 'pla+', material: 'PLA+', minTemp: 200, maxTemp: 230, bedTempMin: 50, bedTempMax: 65, hygroscopy: 'low', tips: 'Stronger than standard PLA' },
  { id: 'petg', material: 'PETG', minTemp: 220, maxTemp: 250, bedTempMin: 70, bedTempMax: 85, hygroscopy: 'medium', tips: 'Flexible, heat resistant. Use lower speed.' },
  { id: 'abs', material: 'ABS', minTemp: 230, maxTemp: 260, bedTempMin: 95, bedTempMax: 110, hygroscopy: 'medium', tips: 'Enclosure recommended. Fumes!' },
  { id: 'asa', material: 'ASA', minTemp: 240, maxTemp: 260, bedTempMin: 90, bedTempMax: 110, hygroscopy: 'medium', tips: 'UV resistant, outdoor use' },
  { id: 'tpu', material: 'TPU', minTemp: 210, maxTemp: 240, bedTempMin: 30, bedTempMax: 60, hygroscopy: 'high', tips: 'Flexible. Disable retraction, slow speed.' },
  { id: 'nylon', material: 'Nylon', minTemp: 240, maxTemp: 270, bedTempMin: 70, bedTempMax: 90, hygroscopy: 'high', tips: 'Must be dried! Very hygroscopic.' },
  { id: 'pc', material: 'PC', minTemp: 260, maxTemp: 300, bedTempMin: 100, bedTempMax: 120, hygroscopy: 'high', tips: 'High temp, enclosure required' },
  { id: 'cf-pla', material: 'CF-PLA', minTemp: 200, maxTemp: 230, bedTempMin: 50, bedTempMax: 60, hygroscopy: 'low', tips: 'Abrasive! Use hardened nozzle.' },
  { id: 'silk', material: 'Silk PLA', minTemp: 190, maxTemp: 220, bedTempMin: 50, bedTempMax: 60, hygroscopy: 'low', tips: 'Shiny finish. Print slower for best results.' },
];

export enum LabelTheme {
  MODERN = 'modern',
  TECHNICAL = 'technical',
  BOLD = 'bold',
  MAINTENANCE = 'maintenance',
  SWATCH = 'swatch',
  MINIMAL = 'minimal'
}

export interface PrintSettings {
  copies: number;
  invert: boolean;
  includeQr: boolean;
  density: number; // 0-100
  theme: LabelTheme;
  marginMm: number;
  visibleFields: {
    brand: boolean;
    weight: boolean;
    notes: boolean;
    date: boolean;
    source: boolean;
  };
  speed?: 1 | 2 | 3 | 4 | 5;
  labelType?: 'gap' | 'continuous' | 'mark';
  autoCalibrate?: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  data: FilamentData;
}

export interface PrinterInfo {
  name: string;
  model?: string;
  firmware?: string;
  battery?: number;
}

export enum AppState {
  HOME,
  CAMERA,
  ANALYZING,
  EDITING,
  PRINTING_SUCCESS
}

export interface LabelPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
  group?: 'Standard' | 'D30/Small';
  deviceId: string;
  gatt?: BluetoothRemoteGATTServer;
}

export const LABEL_PRESETS: LabelPreset[] = [
  // D30 Series (Standard)
  { id: '12x30', name: '12x30mm', widthMm: 30, heightMm: 12, description: 'Small Tag', group: 'D30/Small', deviceId: '' },
  { id: '12x40', name: '12x40mm', widthMm: 40, heightMm: 12, description: 'Cable / Tag', group: 'D30/Small', deviceId: '' },
  { id: '14x30', name: '14x30mm', widthMm: 30, heightMm: 14, description: 'Standard Short', group: 'D30/Small', deviceId: '' },
  { id: '14x40', name: '14x40mm', widthMm: 40, heightMm: 14, description: 'Standard Medium', group: 'D30/Small', deviceId: '' },
  { id: '14x50', name: '14x50mm', widthMm: 50, heightMm: 14, description: 'Standard Long', group: 'D30/Small', deviceId: '' },
  { id: '15x30', name: '15x30mm', widthMm: 30, heightMm: 15, description: 'Wide Short', group: 'D30/Small', deviceId: '' },
  { id: '15x50', name: '15x50mm', widthMm: 50, heightMm: 15, description: 'Wide Long', group: 'D30/Small', deviceId: '' },

  // Special / Continuous
  { id: '6x22', name: '6x22mm', widthMm: 22, heightMm: 6, description: 'Mini / Price Tag', group: 'D30/Small', deviceId: '' },
  { id: '6x100', name: '6mm Continuous', widthMm: 100, heightMm: 6, description: 'Continuous Tape', group: 'D30/Small', deviceId: '' },
];

// Global Bluetooth Types
declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }

  interface Bluetooth extends EventTarget {
    getAvailability(): Promise<boolean>;
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
  }

  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: (string | number)[];
    acceptAllDevices?: boolean;
  }

  interface BluetoothLEScanFilter {
    name?: string;
    namePrefix?: string;
    services?: (string | number)[];
    manufacturerData?: { [key: number]: { dataPrefix?: BufferSource; mask?: BufferSource } }[];
    serviceData?: { [key: string]: { dataPrefix?: BufferSource; mask?: BufferSource } }[];
  }

  interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    watchAdvertisements(): Promise<void>;
    unwatchAdvertisements(): void;
    readonly watchingAdvertisements: boolean;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
    getPrimaryServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
  }

  interface BluetoothRemoteGATTService extends EventTarget {
    uuid: string;
    isPrimary: boolean;
    device: BluetoothDevice;
    getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
    getCharacteristics(characteristic?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
    getIncludedService(service: string | number): Promise<BluetoothRemoteGATTService>;
    getIncludedServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    uuid: string;
    service: BluetoothRemoteGATTService;
    properties: BluetoothCharacteristicProperties;
    value?: DataView;
    getDescriptor(descriptor: string | number): Promise<BluetoothRemoteGATTDescriptor>;
    getDescriptors(descriptor?: string | number): Promise<BluetoothRemoteGATTDescriptor[]>;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    writeValueWithResponse(value: BufferSource): Promise<void>;
    writeValueWithoutResponse(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  interface BluetoothCharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
    reliableWrite: boolean;
    writableAuxiliaries: boolean;
  }

  interface BluetoothRemoteGATTDescriptor {
    uuid: string;
    characteristic: BluetoothRemoteGATTCharacteristic;
    value?: DataView;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
  }
}

// ===== D30 ADVANCED PRO FEATURES =====

// Print Job Queue System
export interface PrintJob {
  id: string;
  label: FilamentData;
  settings: PrintSettings;
  status: 'queued' | 'printing' | 'complete' | 'error';
  progress: number;
  estimatedTime: number;
  createdAt: number;
  error?: string;
}

// Label Template System
export interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  category: 'minimal' | 'detailed' | 'icon' | 'brand' | 'grid' | 'custom';
  author: string;
  layout: TemplateLayout;
  previewUrl?: string;
  supportedSizes: string[];
  tags: string[];
  isFavorite?: boolean;
  createdAt: number;
}

export interface TemplateLayout {
  elements: TemplateElement[];
  backgroundColor: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'rounded';
  borderWidth?: number;
}

export interface TemplateElement {
  type: 'text' | 'qr' | 'icon' | 'divider' | 'colorSwatch' | 'barcode';
  field?: keyof FilamentData | 'custom';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'light';
  align?: 'left' | 'center' | 'right';
  color?: string;
  customText?: string;
  icon?: string;
}

// Printer Statistics & Analytics
export interface PrinterStats {
  totalPrints: number;
  totalLabels: number;
  totalInches: number;
  batteryHealth: number;
  printHeadWear: number;
  lastMaintenance: number;
  averageQuality: number;
  firstPrintDate: number;
  favoriteTemplate?: string;
  mostPrintedMaterial?: string;
}

// Printer Calibration Data
export interface CalibrationData {
  labelWidthMm: number;
  densityOffset: number;
  speedOptimal: 1 | 2 | 3 | 4 | 5;
  lastCalibrated: number;
  calibratedBy: 'user' | 'auto';
}

// QR Code Configuration
export interface QRCodeConfig {
  type: 'url' | 'vcard' | 'custom';
  data: string;
  size: 'small' | 'medium' | 'large';
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  includeInventoryLink: boolean;
  customSchema?: string;
}

// Batch Print Configuration
export interface BatchPrintConfig {
  jobs: PrintJob[];
  optimizeOrder: boolean;
  pauseBetweenJobs: number;
  continueOnError: boolean;
  totalEstimatedTime: number;
}

// Maintenance Log Entry
export interface MaintenanceLog {
  id: string;
  type: 'calibration' | 'cleaning' | 'test' | 'battery';
  timestamp: number;
  notes?: string;
  result: 'success' | 'warning' | 'error';
  details?: any;
}
