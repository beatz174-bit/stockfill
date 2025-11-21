import { IconButton, Stack, TextField } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';

interface NumericStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}

export const NumericStepper = ({ label, value, onChange, min = 0 }: NumericStepperProps) => (
  <Stack direction="row" alignItems="center" spacing={1}>
    <IconButton
      aria-label={`decrease ${label ?? 'value'}`}
      onClick={() => onChange(Math.max(min, value - 1))}
      size="small"
    >
      <RemoveIcon />
    </IconButton>
    <TextField
      size="small"
      type="number"
      label={label}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      inputProps={{ min }}
      sx={{ width: 120 }}
    />
    <IconButton aria-label={`increase ${label ?? 'value'}`} onClick={() => onChange(value + 1)} size="small">
      <AddIcon />
    </IconButton>
  </Stack>
);
