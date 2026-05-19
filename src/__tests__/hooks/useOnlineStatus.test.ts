import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

beforeEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
});

it('returns true when navigator.onLine is true', () => {
  const { result } = renderHook(() => useOnlineStatus());
  expect(result.current).toBe(true);
});

it('returns false when navigator.onLine is false on mount', () => {
  Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
  const { result } = renderHook(() => useOnlineStatus());
  expect(result.current).toBe(false);
});

it('updates to false when offline event fires', () => {
  const { result } = renderHook(() => useOnlineStatus());
  act(() => { window.dispatchEvent(new Event('offline')); });
  expect(result.current).toBe(false);
});

it('updates to true when online event fires after going offline', () => {
  const { result } = renderHook(() => useOnlineStatus());
  act(() => { window.dispatchEvent(new Event('offline')); });
  act(() => { window.dispatchEvent(new Event('online')); });
  expect(result.current).toBe(true);
});

it('removes event listeners on unmount', () => {
  const spy = jest.spyOn(window, 'removeEventListener');
  const { unmount } = renderHook(() => useOnlineStatus());
  unmount();
  expect(spy).toHaveBeenCalledWith('online', expect.any(Function));
  expect(spy).toHaveBeenCalledWith('offline', expect.any(Function));
  spy.mockRestore();
});
