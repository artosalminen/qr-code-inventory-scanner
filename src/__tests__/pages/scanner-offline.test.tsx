import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScannerPage from '@/pages/scanner';
import { enqueue } from '@/lib/scan-queue';
import axios from 'axios';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: 'u1', name: 'Test', email: 'test@test.com' } },
    status: 'authenticated',
  })),
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('axios');

jest.mock('@/lib/scan-queue');

jest.mock('@/components/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// QRScanner mock: fires onScan('TEST-QR-001') when isOpen becomes true
jest.mock('@/components/QRScanner', () => {
  const { useEffect } = require('react');
  return {
    __esModule: true,
    default: ({ onScan, isOpen }: { onScan: (qr: string) => void; isOpen: boolean }) => {
      useEffect(() => {
        if (isOpen) onScan('TEST-QR-001');
      }, [isOpen]);
      return null;
    },
  };
});

jest.mock('@/lib/use-persisted-project', () => ({
  usePersistedProject: jest.fn(() => ['proj-1', jest.fn()]),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;
const mockedAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;
const mockedEnqueue = enqueue as jest.MockedFunction<typeof enqueue>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedAxiosGet.mockImplementation((url: string) => {
    if (String(url) === '/api/projects') {
      return Promise.resolve({ data: [{ id: 'proj-1', name: 'Test Project' }] });
    }
    return Promise.resolve({
      data: { projectUsers: [{ userId: 'u1', role: 'inventory_management' }] },
    });
  });
  mockedEnqueue.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
});

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

it('enqueues scan and does not POST to /api/boxes/scan when offline', async () => {
  render(<ScannerPage />);

  // Open the scanner
  const openBtn = await screen.findByRole('button', { name: /openScanner/i });
  fireEvent.click(openBtn);

  // QRScanner mock fires onScan → confirm screen appears
  await waitFor(() => {
    expect(screen.getByText('confirmScan')).toBeInTheDocument();
  });

  // Click confirm
  const confirmBtn = screen.getByRole('button', { name: 'confirm' });
  fireEvent.click(confirmBtn);

  await waitFor(() => {
    expect(mockedEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        qrCode: 'TEST-QR-001',
        projectId: 'proj-1',
        action: 'check_in',
        condition: 'ok',
      }),
    );
  });

  // axios.post('/api/boxes/scan') must NOT have been called
  const scanPostCalls = mockedAxiosPost.mock.calls.filter(
    ([url]) => url === '/api/boxes/scan',
  );
  expect(scanPostCalls).toHaveLength(0);
});

it('shows offline banner when navigator.onLine is false', async () => {
  render(<ScannerPage />);
  await waitFor(() => {
    expect(screen.getByText('offlineBanner')).toBeInTheDocument();
  });
});
