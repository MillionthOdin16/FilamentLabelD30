import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tryReconnect, connectPrinter } from '../../services/printerService';

// Mock types
type MockBluetoothDevice = {
    id: string;
    name: string;
    gatt: {
        connected: boolean;
        connect: () => Promise<any>;
        disconnect: () => void;
    };
    addEventListener: (type: string, listener: any) => void;
};

describe('printerService', () => {
    let mockDevices: MockBluetoothDevice[];
    let mockLocalStorage: Record<string, string> = {};

    beforeEach(() => {
        // Reset mocks
        mockDevices = [];
        mockLocalStorage = {};

        // Mock localStorage
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
            setItem: vi.fn((key: string, value: string) => { mockLocalStorage[key] = value; }),
            removeItem: vi.fn((key: string) => { delete mockLocalStorage[key]; }),
            clear: vi.fn(() => { mockLocalStorage = {}; })
        });

        // Mock navigator.bluetooth
        vi.stubGlobal('navigator', {
            bluetooth: {
                getDevices: vi.fn(async () => mockDevices),
                requestDevice: vi.fn(async () => {
                   if (mockDevices.length > 0) return mockDevices[0];
                   throw new Error("No device found");
                })
            }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('connectPrinter should save device ID to localStorage', async () => {
        const device: MockBluetoothDevice = {
            id: 'device-123',
            name: 'My Printer',
            gatt: {
                connected: false,
                connect: vi.fn().mockResolvedValue({ connected: true }),
                disconnect: vi.fn()
            },
            addEventListener: vi.fn()
        };
        mockDevices = [device];

        await connectPrinter();

        expect(localStorage.setItem).toHaveBeenCalledWith('last_printer_id', 'device-123');
    });

    it('tryReconnect should prioritize cached device ID', async () => {
        const device1: MockBluetoothDevice = {
            id: 'device-1',
            name: 'Printer 1',
            gatt: {
                connected: false,
                connect: vi.fn().mockResolvedValue({ connected: true }),
                disconnect: vi.fn()
            },
            addEventListener: vi.fn()
        };
        const device2: MockBluetoothDevice = {
            id: 'device-2',
            name: 'Printer 2',
            gatt: {
                connected: false,
                connect: vi.fn().mockResolvedValue({ connected: true }),
                disconnect: vi.fn()
            },
            addEventListener: vi.fn()
        };

        // Devices returned in order: [1, 2]
        mockDevices = [device1, device2];

        // Set preference for device 2
        mockLocalStorage['last_printer_id'] = 'device-2';

        // We need to spy on connect to see which one was called first
        // However, tryReconnect iterates and awaits.
        // We can check if the devices array was sorted.
        // But we don't have access to the internal logic variable.

        // Instead, let's make the connect fail for the first one attempted to see the order?
        // Or simply rely on the fact that if logic is correct, it tries device-2 first.

        // Let's spy on the connect methods.
        const connectSpy1 = vi.spyOn(device1.gatt, 'connect');
        const connectSpy2 = vi.spyOn(device2.gatt, 'connect');

        await tryReconnect();

        // If sorted correctly, device2 should be tried first.
        // Since tryReconnect stops after first success, device1 should NOT be connected if device2 succeeds.
        expect(connectSpy2).toHaveBeenCalled();
        expect(connectSpy1).not.toHaveBeenCalled();
    });

    it('tryReconnect should fallback to others if prioritized device fails', async () => {
        const device1: MockBluetoothDevice = {
            id: 'device-1',
            name: 'Printer 1',
            gatt: {
                connected: false,
                connect: vi.fn().mockResolvedValue({ connected: true }),
                disconnect: vi.fn()
            },
            addEventListener: vi.fn()
        };
        const device2: MockBluetoothDevice = {
            id: 'device-2',
            name: 'Printer 2',
            gatt: {
                connected: false,
                connect: vi.fn().mockRejectedValue(new Error("Connection failed")),
                disconnect: vi.fn()
            },
            addEventListener: vi.fn()
        };

        mockDevices = [device1, device2];
        mockLocalStorage['last_printer_id'] = 'device-2';

        const connectSpy1 = vi.spyOn(device1.gatt, 'connect');
        const connectSpy2 = vi.spyOn(device2.gatt, 'connect');

        await tryReconnect();

        // Device 2 tried first (and failed)
        expect(connectSpy2).toHaveBeenCalled();
        // Then device 1 tried (and succeeded)
        expect(connectSpy1).toHaveBeenCalled();
    });

    it('tryReconnect works without cached ID (default behavior)', async () => {
        const device1: MockBluetoothDevice = {
            id: 'device-1',
            name: 'Printer 1',
            gatt: {
                connected: false,
                connect: vi.fn().mockResolvedValue({ connected: true }),
                disconnect: vi.fn()
            },
            addEventListener: vi.fn()
        };
        const device2: MockBluetoothDevice = {
            id: 'device-2',
            name: 'Printer 2',
            gatt: {
                connected: false,
                connect: vi.fn().mockResolvedValue({ connected: true }),
                disconnect: vi.fn()
            },
            addEventListener: vi.fn()
        };

        mockDevices = [device1, device2];
        // No local storage

        const connectSpy1 = vi.spyOn(device1.gatt, 'connect');
        const connectSpy2 = vi.spyOn(device2.gatt, 'connect');

        await tryReconnect();

        // Should try in order [1, 2], so 1 succeeds and stops
        expect(connectSpy1).toHaveBeenCalled();
        expect(connectSpy2).not.toHaveBeenCalled();
    });
});
