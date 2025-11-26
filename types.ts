
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
}

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
}

export const LABEL_PRESETS: LabelPreset[] = [
  // D30 / D35 Series (Small Tapes)
  { id: '12x40', name: '12x40mm', widthMm: 40, heightMm: 12, description: 'D30 Cable/Tag', group: 'D30/Small' },
  { id: '14x30', name: '14x30mm', widthMm: 30, heightMm: 14, description: 'D30 Standard', group: 'D30/Small' },
  { id: '14x50', name: '14x50mm', widthMm: 50, heightMm: 14, description: 'D30 Long', group: 'D30/Small' },
  { id: '15x30', name: '15x30mm', widthMm: 30, heightMm: 15, description: 'D35 Standard', group: 'D30/Small' },
  
  // M110 / M02 Series (Wider)
  { id: '30x20', name: '30x20mm', widthMm: 30, heightMm: 20, description: 'Small / Jewelry', group: 'Standard' },
  { id: '40x30', name: '40x30mm', widthMm: 40, heightMm: 30, description: 'Standard M110', group: 'Standard' },
  { id: '50x30', name: '50x30mm', widthMm: 50, heightMm: 30, description: 'Wide Standard', group: 'Standard' },
  { id: '50x50', name: '50x50mm', widthMm: 50, heightMm: 50, description: 'Square', group: 'Standard' },
  { id: '50x70', name: '50x70mm', widthMm: 50, heightMm: 70, description: 'Large Vertical', group: 'Standard' },
  { id: '50x80', name: '50x80mm', widthMm: 50, heightMm: 80, description: 'Mailing / Full', group: 'Standard' },
];

export interface PrinterDevice {
  name: string;
  deviceId: string;
  gatt?: BluetoothRemoteGATTServer;
}

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