import { Button, ButtonProps } from '@mui/material';
import React from 'react';
import { useLongPress } from '../hooks/useLongPress';

interface LongPressButtonProps extends ButtonProps {
  onLongPress: () => void;
}

export const LongPressButton = ({ onLongPress, onClick, children, ...rest }: LongPressButtonProps) => {
  const gestureHandlers = useLongPress({
    onLongPress,
    onClick: onClick ? () => onClick({} as React.MouseEvent<HTMLButtonElement>) : undefined,
  });

  return (
    <Button {...rest} {...gestureHandlers} onClick={undefined}>
      {children}
    </Button>
  );
};
