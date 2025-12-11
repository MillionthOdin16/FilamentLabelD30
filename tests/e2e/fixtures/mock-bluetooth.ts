
import { Page } from '@playwright/test';

// Mock Web Bluetooth API
export async function injectBluetoothMock(page: Page) {
  await page.addInitScript(() => {
    class BluetoothDevice extends EventTarget {
      id: string;
      name: string;
      gatt: BluetoothRemoteGATTServer;

      constructor(id: string, name: string) {
        super();
        this.id = id;
        this.name = name;
        this.gatt = new BluetoothRemoteGATTServer(this);
      }
    }

    class BluetoothRemoteGATTServer {
      device: BluetoothDevice;
      connected: boolean;

      constructor(device: BluetoothDevice) {
        this.device = device;
        this.connected = false;
      }

      async connect() {
        this.connected = true;
        return this;
      }

      async disconnect() {
        this.connected = false;
      }

      async getPrimaryService(uuid: string) {
        return new BluetoothRemoteGATTService(this.device, uuid);
      }
    }

    class BluetoothRemoteGATTService {
      device: BluetoothDevice;
      uuid: string;

      constructor(device: BluetoothDevice, uuid: string) {
        this.device = device;
        this.uuid = uuid;
      }

      async getCharacteristic(uuid: string) {
        return new BluetoothRemoteGATTCharacteristic(this, uuid);
      }
    }

    class BluetoothRemoteGATTCharacteristic {
      service: BluetoothRemoteGATTService;
      uuid: string;

      constructor(service: BluetoothRemoteGATTService, uuid: string) {
        this.service = service;
        this.uuid = uuid;
      }

      async writeValue(value: BufferSource) {
        console.log(`[MockBluetooth] Writing value to ${this.uuid}`);
        return Promise.resolve();
      }

      async readValue() {
          console.log(`[MockBluetooth] Reading value from ${this.uuid}`);
          // Return a mock battery level (e.g. 100)
          return new DataView(new Uint8Array([100]).buffer);
      }
    }

    // Mock Navigator Bluetooth
    const mockDevice = new BluetoothDevice('mock-device-id', 'Mock Printer D30');

    (navigator as any).bluetooth = {
      requestDevice: async (options: any) => {
        console.log('[MockBluetooth] Requesting device', options);
        return mockDevice;
      },
      getDevices: async () => {
          return [mockDevice];
      }
    };

    // Also mock permissions if needed
    if (!navigator.permissions) {
        (navigator as any).permissions = {};
    }
  });
}
