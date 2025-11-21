import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

type BarcodeDetection = { rawValue: string };
type BarcodeDetectorClass = new () => { detect: (source: ImageBitmapSource) => Promise<BarcodeDetection[]> };

export interface BarcodeResult {
  code?: string;
  error?: string;
}

export const useBarcodeScanner = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [result, setResult] = useState<BarcodeResult>({});

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let active = true;
    let stop: (() => void) | undefined;
    let currentVideoElement: HTMLVideoElement | null = null;

    const start = async () => {
      try {
        const detectorClass = (
          window as typeof window & { BarcodeDetector?: BarcodeDetectorClass }
        ).BarcodeDetector;
        if (detectorClass) {
          const detector = new detectorClass();
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            currentVideoElement = videoRef.current;
          }
          const scan = async () => {
            if (!active || !videoRef.current) return;
            const tracks = (videoRef.current.srcObject as MediaStream | null)?.getVideoTracks();
            if (!tracks || tracks.length === 0) return;
            const frame = await createImageBitmap(videoRef.current);
            const codes = await detector.detect(frame);
            if (codes.length > 0) {
              setResult({ code: codes[0].rawValue });
            } else {
              requestAnimationFrame(scan);
            }
          };
          void scan();
        } else {
          const controls = await reader.decodeFromVideoDevice(
            undefined,
            videoRef.current ?? undefined,
            (decoded) => {
              if (decoded) {
                setResult({ code: decoded.getText() });
              }
            },
          );
          stop = () => controls.stop();
        }
      } catch (error) {
        setResult({ error: (error as Error).message });
      }
    };

    void start();
    return () => {
      active = false;
      stop?.();
      const stream = currentVideoElement?.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { videoRef, result };
};
