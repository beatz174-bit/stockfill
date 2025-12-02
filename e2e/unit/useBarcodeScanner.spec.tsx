import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@zxing/browser', () => {
  class MockReader {
    decodeFromVideoDevice = vi.fn(async (_device: any, _video: any, callback: any) => {
      callback({ getText: () => 'decoded-fallback' } as any);
      return { stop: vi.fn() } as any;
    });
  }
  return { BrowserMultiFormatReader: MockReader };
});

describe('useBarcodeScanner', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    (globalThis as any).BarcodeDetector = undefined;
  });

  afterEach(() => {
    delete (globalThis as any).BarcodeDetector;
  });

  test('falls back to ZXing reader when BarcodeDetector is unavailable', async () => {
    const { useBarcodeScanner } = await import('../../src/hooks/useBarcodeScanner');
    const { result } = renderHook(() => useBarcodeScanner());
    result.current.videoRef.current = document.createElement('video');

    await waitFor(() => expect(result.current.result.code).toBe('decoded-fallback'));
  });

  test('uses BarcodeDetector when available', async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: 'detected-code' }]);
    class MockBarcodeDetector {
      detect = detect;
    }
    (globalThis as any).BarcodeDetector = MockBarcodeDetector as any;

    const play = vi.fn().mockResolvedValue(undefined);
    const getVideoTracks = vi.fn().mockReturnValue([{ stop: vi.fn() }]);
    const getTracks = vi.fn().mockReturnValue([{ stop: vi.fn() }]);
    const stream = { getVideoTracks, getTracks } as any;
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(stream),
    } as any;
    (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue({});

    const { useBarcodeScanner } = await import('../../src/hooks/useBarcodeScanner');
    const { result } = renderHook(() => useBarcodeScanner());
    const video = document.createElement('video');
    Object.defineProperty(video, 'play', { value: play });
    result.current.videoRef.current = video;

    await waitFor(() => expect(result.current.result.code).toBe('detected-code'));
    expect(detect).toHaveBeenCalled();
  });
});
