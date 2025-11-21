import { useCallback, useMemo, useRef } from 'react';

interface LongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

export const useLongPress = ({ delay = 500, onLongPress, onClick }: LongPressOptions) => {
  const timerRef = useRef<number>();
  const handledRef = useRef(false);

  const start = useCallback(() => {
    handledRef.current = false;
    timerRef.current = window.setTimeout(() => {
      handledRef.current = true;
      onLongPress();
    }, delay);
  }, [delay, onLongPress]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const onRelease = useCallback(() => {
    clear();
    if (!handledRef.current && onClick) {
      onClick();
    }
  }, [clear, onClick]);

  return useMemo(
    () => ({
      onMouseDown: start,
      onTouchStart: start,
      onMouseUp: onRelease,
      onMouseLeave: clear,
      onTouchEnd: onRelease,
    }),
    [start, onRelease, clear],
  );
};
