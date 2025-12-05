
import { Page } from '@playwright/test';

export const mockBluetooth = async (page: Page) => {
  await page.addInitScript(() => {
    class MockBluetoothDevice extends EventTarget {
      id = 'mock-device-id';
      name = 'Mock Printer D30';
      gatt = {
        connected: true,
        connect: async () => this.gatt,
        disconnect: () => { this.gatt.connected = false; },
        getPrimaryService: async (uuid: string) => new MockBluetoothService(uuid),
        getPrimaryServices: async () => [],
        device: this
      };
      watchAdvertisements = async () => {};
      unwatchAdvertisements = () => {};
      watchingAdvertisements = false;
    }

    class MockBluetoothService extends EventTarget {
      uuid: string;
      isPrimary = true;
      device = new MockBluetoothDevice();
      constructor(uuid: string) { super(); this.uuid = uuid; }
      getCharacteristic = async (uuid: string) => new MockBluetoothCharacteristic(uuid, this);
      getCharacteristics = async () => [];
      getIncludedService = async () => new MockBluetoothService('included');
      getIncludedServices = async () => [];
    }

    class MockBluetoothCharacteristic extends EventTarget {
      uuid: string;
      service: MockBluetoothService;
      properties = { write: true, writeWithoutResponse: true, read: true, notify: true };
      value = new DataView(new ArrayBuffer(1));
      constructor(uuid: string, service: MockBluetoothService) {
          super();
          this.uuid = uuid;
          this.service = service;
      }
      writeValue = async (val: BufferSource) => {};
      writeValueWithoutResponse = async (val: BufferSource) => {};
      readValue = async () => new DataView(new Uint8Array([100]).buffer); // 100% battery
    }

    // Force override navigator.bluetooth
    Object.defineProperty(navigator, 'bluetooth', {
        value: {
          requestDevice: async () => {
            console.log('Mock requestDevice called');
            return new MockBluetoothDevice();
          },
          getAvailability: async () => true
        },
        writable: true,
        configurable: true
    });
  });
};

export const MOCK_BLUETOOTH_DEVICE_NAME = 'Mock Printer D30';
