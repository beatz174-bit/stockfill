import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useServiceWorker } from '../useServiceWorker';

const flushMicrotasks = async () => {
  await act(async () => {
    vi.runAllTicks();
  });
};

describe('useServiceWorker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (navigator as any).serviceWorker;
  });

  it('returns true when service worker registration succeeds', async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    (navigator as any).serviceWorker = { register: registerMock };

    const { result } = renderHook(() => useServiceWorker());

    await flushMicrotasks();

    expect(registerMock).toHaveBeenCalledWith('/service-worker.js');
    expect(result.current).toBe(true);
  });

  it('returns false when service worker registration fails', async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error('registration failed'));
    (navigator as any).serviceWorker = { register: registerMock };

    const { result } = renderHook(() => useServiceWorker());

    await flushMicrotasks();

    expect(registerMock).toHaveBeenCalledWith('/service-worker.js');
    expect(result.current).toBe(false);
  });

  it('keeps registration false when service workers are unavailable', async () => {
    expect('serviceWorker' in navigator).toBe(false);

    const registerMock = vi.fn();

    const { result } = renderHook(() => useServiceWorker());

    await flushMicrotasks();

    expect(result.current).toBe(false);
    expect(registerMock).not.toHaveBeenCalled();
  });
});
