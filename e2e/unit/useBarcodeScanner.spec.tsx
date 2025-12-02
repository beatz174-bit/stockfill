import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@zxing/browser', () => {
  class MockReader {
    decodeFromVideoDevice = vi.fn(
      async (
        _device: string | undefined,
        _video: HTMLVideoElement,
        callback: (result: { getText: () => string }) => void,
      ) => {
        callback({ getText: () => 'decoded-fallback' });
        return { stop: vi.fn() };
      },
    );
  }

  return { BrowserMultiFormatReader: MockReader };
});

describe('useBarcodeScanner', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    const globalWithBarcode = globalThis as typeof globalThis & {
      BarcodeDetector?: new () => { detect: (source: ImageBitmap | HTMLCanvasElement) => Promise<Array<{ rawValue: string }>> };
    };
    globalWithBarcode.BarcodeDetector = undefined;
  });

  afterEach(() => {
    const globalWithBarcode = globalThis as typeof globalThis & { BarcodeDetector?: unknown };
    delete globalWithBarcode.BarcodeDetector;
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
    const globalWithBarcode = globalThis as typeof globalThis & { BarcodeDetector?: typeof MockBarcodeDetector };
    globalWithBarcode.BarcodeDetector = MockBarcodeDetector;

    const play = vi.fn().mockResolvedValue(undefined);
    const getVideoTracks = vi.fn().mockReturnValue([{ stop: vi.fn() }]);
    const getTracks = vi.fn().mockReturnValue([{ stop: vi.fn() }]);
    const stream = { getVideoTracks, getTracks };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
      configurable: true,
    });
    const createImageBitmap = vi.fn<[], Promise<ImageBitmap>>().mockResolvedValue({} as ImageBitmap);
    const globalWithBitmap = globalThis as typeof globalThis & { createImageBitmap?: typeof createImageBitmap };
    globalWithBitmap.createImageBitmap = createImageBitmap;

    const { useBarcodeScanner } = await import('../../src/hooks/useBarcodeScanner');
    const { result } = renderHook(() => useBarcodeScanner());
    const video = document.createElement('video');
    Object.defineProperty(video, 'play', { value: play });
    result.current.videoRef.current = video;

    await waitFor(() => expect(result.current.result.code).toBe('detected-code'));
    expect(detect).toHaveBeenCalled();
  });
});
