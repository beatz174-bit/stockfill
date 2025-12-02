import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';

const setupHook = async () => {
  const module = await import('../src/hooks/useServiceWorker');
  return module.useServiceWorker;
};

describe('useServiceWorker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('registers service worker successfully', async () => {
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    const useServiceWorker = await setupHook();
    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => expect(result.current).toBe(true));
    expect(register).toHaveBeenCalledWith('/service-worker.js');
  });

  test('handles registration failure', async () => {
    const register = vi.fn().mockRejectedValue(new Error('fail'));
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    const useServiceWorker = await setupHook();
    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => expect(result.current).toBe(false));
  });
});
