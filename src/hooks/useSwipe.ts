import { useMemo, useRef } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export const useSwipe = ({ onSwipeLeft, onSwipeRight, threshold = 50 }: SwipeConfig) => {
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.changedTouches[0].screenX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const deltaX = e.changedTouches[0].screenX - startX.current;
    if (deltaX < -threshold) {
      onSwipeLeft?.();
    } else if (deltaX > threshold) {
      onSwipeRight?.();
    }
    startX.current = null;
  };

  return useMemo(
    () => ({
      onTouchStart,
      onTouchEnd,
    }),
    [],
  );
};
