import { Box, Paper } from '@mui/material';
import { PropsWithChildren } from 'react';
import { useSwipe } from '../hooks/useSwipe';

interface SwipeableRowProps extends PropsWithChildren {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const SwipeableRow = ({ children, onSwipeLeft, onSwipeRight }: SwipeableRowProps) => {
  const gestureHandlers = useSwipe({ onSwipeLeft, onSwipeRight });

  return (
    <Paper sx={{ p: 1, mb: 1 }} {...gestureHandlers}>
      <Box>{children}</Box>
    </Paper>
  );
};
