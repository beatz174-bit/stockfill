import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

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

    const start = async () => {
      try {
        if ('BarcodeDetector' in window) {
          const detector = new (window as typeof window & { BarcodeDetector: any }).BarcodeDetector();
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
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
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { videoRef, result };
};
