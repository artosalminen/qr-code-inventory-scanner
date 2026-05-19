import { enqueue, getAll, remove } from '@/lib/scan-queue';
import type { QueuedScan } from '@/lib/scan-queue';

it('exports enqueue, getAll, remove as functions', () => {
  expect(typeof enqueue).toBe('function');
  expect(typeof getAll).toBe('function');
  expect(typeof remove).toBe('function');
});

it('QueuedScan type has all required fields', () => {
  const scan: QueuedScan = {
    id: 'test-id',
    qrCode: 'QR123',
    projectId: 'proj-1',
    action: 'check_in',
    condition: 'ok',
    notes: '',
    timestamp: Date.now(),
  };
  expect(scan.id).toBeDefined();
  expect(scan.qrCode).toBeDefined();
  expect(scan.projectId).toBeDefined();
  expect(scan.action).toBeDefined();
  expect(scan.condition).toBeDefined();
  expect(scan.timestamp).toBeDefined();
});
