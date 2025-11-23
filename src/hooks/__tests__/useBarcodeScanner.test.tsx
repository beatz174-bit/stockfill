import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi, type MockInstance } from 'vitest';
import { useBarcodeScanner } from '../useBarcodeScanner';

const decodeFromVideoDevice = vi.fn();

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice,
  })),
}));

declare global {
  interface Window {
    BarcodeDetector?: new () => { detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]> };
  }
}

const createMediaStream = (stopSpy: MockInstance = vi.fn()) => {
  const track = { stop: stopSpy } as unknown as MediaStreamTrack;
  return {
    getTracks: vi.fn(() => [track]),
    getVideoTracks: vi.fn(() => [track]),
  } as unknown as MediaStream;
};

const createVideoElement = () => {
  let srcObject: MediaStream | null = null;
  return {
    play: vi.fn(() => Promise.resolve()),
    get srcObject() {
      return srcObject;
    },
    set srcObject(value: MediaStream | null) {
      srcObject = value;
    },
  } as unknown as HTMLVideoElement;
};

beforeEach(() => {
  decodeFromVideoDevice.mockReset();
  (globalThis as unknown as { createImageBitmap: typeof createImageBitmap }).createImageBitmap = vi
    .fn()
    .mockResolvedValue({} as ImageBitmap);
  Object.assign(navigator, {
    mediaDevices: {
      getUserMedia: vi.fn(),
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  delete (window as Window & { BarcodeDetector?: unknown }).BarcodeDetector;
});

describe('useBarcodeScanner', () => {
  it('uses native BarcodeDetector when available and sets the detected code', async () => {
    const trackStop = vi.fn();
    const stream = createMediaStream(trackStop);
    const getUserMediaMock = navigator.mediaDevices.getUserMedia as unknown as MockInstance;
    getUserMediaMock.mockResolvedValue(stream);

    class MockBarcodeDetector {
      detect = vi.fn(async () => [{ rawValue: 'NATIVE-123' }]);
    }

    (window as Window).BarcodeDetector = MockBarcodeDetector;
    const videoElement = createVideoElement();

    const { result, unmount } = renderHook(() => {
      const hook = useBarcodeScanner();
      hook.videoRef.current = videoElement;
      return hook;
    });

    await waitFor(() => expect(result.current.result.code).toBe('NATIVE-123'));

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });

    unmount();
    expect(trackStop).toHaveBeenCalled();
  });

  it('falls back to BrowserMultiFormatReader and returns decoded text', async () => {
    delete (window as Window).BarcodeDetector;
    const stopControls = vi.fn();

    decodeFromVideoDevice.mockImplementation(async (_deviceId, _video, callback) => {
      callback({ getText: () => 'FALLBACK-789' } as unknown as { getText: () => string });
      return { stop: stopControls };
    });

    const videoElement = createVideoElement();

    const { result, unmount } = renderHook(() => {
      const hook = useBarcodeScanner();
      hook.videoRef.current = videoElement;
      return hook;
    });

    await waitFor(() => {
      expect(decodeFromVideoDevice).toHaveBeenCalled();
      expect(result.current.result.code).toBe('FALLBACK-789');
    });

    unmount();
    expect(stopControls).toHaveBeenCalled();
  });

  it('surfaces errors encountered while starting the scanner', async () => {
    const getUserMediaMock = navigator.mediaDevices.getUserMedia as unknown as MockInstance;
    getUserMediaMock.mockRejectedValue(new Error('Camera denied'));

    class MockBarcodeDetector {
      detect = vi.fn(async () => []);
    }

    (window as Window).BarcodeDetector = MockBarcodeDetector;
    const videoElement = createVideoElement();

    const { result } = renderHook(() => {
      const hook = useBarcodeScanner();
      hook.videoRef.current = videoElement;
      return hook;
    });

    await waitFor(() => expect(result.current.result.error).toBe('Camera denied'));
  });
});
