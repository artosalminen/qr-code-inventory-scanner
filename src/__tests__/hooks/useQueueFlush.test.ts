import { renderHook, act, waitFor } from '@testing-library/react';
import axios from 'axios';
import { getAll, remove } from '@/lib/scan-queue';
import { useQueueFlush } from '@/hooks/useQueueFlush';
import type { QueuedScan } from '@/lib/scan-queue';

jest.mock('axios');
jest.mock('@/lib/scan-queue');

const mockedGetAll = getAll as jest.MockedFunction<typeof getAll>;
const mockedRemove = remove as jest.MockedFunction<typeof remove>;
const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

const makeScan = (overrides: Partial<QueuedScan> = {}): QueuedScan => ({
  id: 'scan-1',
  qrCode: 'QR001',
  projectId: 'proj-1',
  action: 'check_in',
  condition: 'ok',
  notes: '',
  timestamp: 1000,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedRemove.mockResolvedValue(undefined);
});

it('posts each queued scan to /api/boxes/scan on mount', async () => {
  const scan = makeScan();
  mockedGetAll.mockResolvedValue([scan]);
  mockedAxiosPost.mockResolvedValue({ data: {} });

  renderHook(() => useQueueFlush());

  await waitFor(() => {
    expect(mockedAxiosPost).toHaveBeenCalledWith('/api/boxes/scan', {
      projectId: scan.projectId,
      qrCode: scan.qrCode,
      action: scan.action,
      condition: scan.condition,
      notes: scan.notes,
    });
  });
});

it('removes each item after processing regardless of success or failure', async () => {
  const scan = makeScan();
  mockedGetAll.mockResolvedValue([scan]);
  mockedAxiosPost.mockRejectedValue({ response: { data: { error: 'Already checked in' } } });

  renderHook(() => useQueueFlush());

  await waitFor(() => {
    expect(mockedRemove).toHaveBeenCalledWith(scan.id);
  });
});

it('calls onResult with succeeded count and failed list', async () => {
  const scan1 = makeScan({ id: 'scan-1', qrCode: 'QR001', timestamp: 1000 });
  const scan2 = makeScan({ id: 'scan-2', qrCode: 'QR002', timestamp: 2000 });
  mockedGetAll.mockResolvedValue([scan1, scan2]);
  mockedAxiosPost
    .mockResolvedValueOnce({ data: {} })
    .mockRejectedValueOnce({ response: { data: { error: 'Invalid state' } } });

  const onResult = jest.fn();
  renderHook(() => useQueueFlush(onResult));

  await waitFor(() => {
    expect(onResult).toHaveBeenCalledWith({
      succeeded: 1,
      failed: [{ qrCode: 'QR002', error: 'Invalid state' }],
    });
  });
});

it('does not call onResult when queue is empty', async () => {
  mockedGetAll.mockResolvedValue([]);
  const onResult = jest.fn();
  renderHook(() => useQueueFlush(onResult));

  await waitFor(() => expect(mockedGetAll).toHaveBeenCalled());
  expect(onResult).not.toHaveBeenCalled();
});

it('flushes again when the online event fires', async () => {
  mockedGetAll.mockResolvedValue([]);
  renderHook(() => useQueueFlush());
  await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(1));

  mockedGetAll.mockResolvedValue([makeScan()]);
  mockedAxiosPost.mockResolvedValue({ data: {} });

  act(() => { window.dispatchEvent(new Event('online')); });

  await waitFor(() => expect(mockedGetAll).toHaveBeenCalledTimes(2));
});
