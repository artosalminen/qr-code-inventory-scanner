import { useEffect, useRef } from 'react';
import axios from 'axios';
import { getAll, remove } from '@/lib/scan-queue';

export interface FlushResult {
  succeeded: number;
  failed: Array<{ qrCode: string; error: string }>;
}

async function flushQueue(): Promise<FlushResult> {
  const items = await getAll();
  const result: FlushResult = { succeeded: 0, failed: [] };

  for (const item of items) {
    try {
      await axios.post('/api/boxes/scan', {
        projectId: item.projectId,
        qrCode: item.qrCode,
        action: item.action,
        condition: item.condition,
        notes: item.notes,
      });
      result.succeeded++;
    } catch (error: any) {
      result.failed.push({
        qrCode: item.qrCode,
        error: error.response?.data?.error ?? 'Sync failed',
      });
    }
    await remove(item.id);
  }

  return result;
}

export function useQueueFlush(onResult?: (result: FlushResult) => void): void {
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const run = async () => {
      const result = await flushQueue();
      if (result.succeeded > 0 || result.failed.length > 0) {
        onResultRef.current?.(result);
      }
    };

    run();
    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, []);
}
